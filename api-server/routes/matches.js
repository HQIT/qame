const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const Match = require('../models/Match');
const MatchPlayer = require('../models/MatchPlayer');
const { query } = require('../config/database');

// 使用undici作为fetch替代品（已在dependencies中）
const { fetch } = require('undici');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取match列表
router.get('/', async (req, res) => {
  try {
    const { gameId, status, includeMyMatches } = req.query;
    const filters = {};

    if (gameId) filters.gameId = gameId;
    if (status) filters.status = status;

    let matches;
    if (includeMyMatches === 'true') {
      // 获取用户相关的matches
      matches = await Match.findActiveByUser(req.user.id);
    } else {
      matches = await Match.findAll(filters);
    }

    // 为每个match获取玩家信息
    const matchesWithPlayers = await Promise.all(
      matches.map(async (match) => {
        const players = await MatchPlayer.findByMatchId(match.id);
        return {
          ...match,
          players: players.map(p => p.getDisplayInfo()),
          currentPlayerCount: players.length
        };
      })
    );

    res.json({
      code: 200,
      message: '获取match列表成功',
      data: matchesWithPlayers
    });
  } catch (error) {
    console.error('获取match列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取match列表失败',
      data: null
    });
  }
});

// 创建新match
router.post('/', async (req, res) => {
  try {
    const { gameType, gameConfig = {}, isPrivate = false, autoStart = false } = req.body;

    if (!gameType) {
      return res.status(400).json({
        code: 400,
        message: '游戏类型不能为空',
        data: null
      });
    }

    // 获取游戏信息
    const gameResult = await query('SELECT * FROM games WHERE id = $1 AND status = $2', [gameType, 'active']);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '游戏类型不存在',
        data: null
      });
    }

    const game = gameResult.rows[0];
    const matchId = uuidv4();

    // 创建match记录
    const match = await Match.create({
      id: matchId,
      gameId: gameType,
      creatorId: req.user.id,
      maxPlayers: game.max_players,
      minPlayers: game.min_players,
      allowSpectators: gameConfig.allowSpectators || false,
      isPrivate,
      autoStart,
      gameConfig
    });

    // 同时在boardgame.io中创建match
    try {
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      const createUrl = `${gameServerUrl}/games/${gameType}/create`;
      
      console.log('尝试创建boardgame.io match:', { createUrl, matchId, gameType });
      
      const bgioResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchID: matchId,
          numPlayers: game.max_players,
          setupData: gameConfig
        })
      });

      console.log('boardgame.io响应状态:', bgioResponse.status);

      if (!bgioResponse.ok) {
        const errorText = await bgioResponse.text();
        console.error('创建boardgame.io match失败:', bgioResponse.status, errorText);
        // 如果boardgame.io创建失败，删除数据库记录
        await Match.delete(matchId);
        throw new Error(`创建游戏match失败: ${bgioResponse.status} - ${errorText}`);
      }

      const bgioData = await bgioResponse.json();
      console.log('boardgame.io match创建成功:', bgioData);
      
      // 保存boardgame.io返回的真实match ID
      if (bgioData.matchID) {
        await query('UPDATE matches SET bgio_match_id = $1 WHERE id = $2', [bgioData.matchID, matchId]);
        console.log('已保存boardgame.io match ID:', bgioData.matchID);
      }
    } catch (error) {
      console.error('创建boardgame.io match失败:', error.message);
      await Match.delete(matchId);
      return res.status(500).json({
        code: 500,
        message: '创建游戏match失败: ' + error.message,
        data: null
      });
    }

    const matchWithPlayers = await Match.findByIdWithPlayers(matchId);

    res.status(201).json({
      code: 200,
      message: 'Match创建成功',
      data: {
        ...matchWithPlayers,
        players: [],
        currentPlayerCount: 0
      }
    });
  } catch (error) {
    console.error('创建match失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建match失败',
      data: null
    });
  }
});

// 获取match详情
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findByIdWithPlayers(matchId);

    if (!match) {
      return res.status(404).json({
        code: 404,
        message: 'Match不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: '获取match详情成功',
      data: {
        ...match,
        players: match.players.map(p => new MatchPlayer(p).getDisplayInfo()),
        currentPlayerCount: match.players.length
      }
    });
  } catch (error) {
    console.error('获取match详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取match详情失败',
      data: null
    });
  }
});

// 删除match
router.delete('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // 检查权限
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '没有权限删除此match',
        data: null
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        code: 404,
        message: 'Match不存在',
        data: null
      });
    }

    // 只能删除未开始的match
    if (match.status === 'playing') {
      return res.status(400).json({
        code: 400,
        message: '无法删除进行中的match',
        data: null
      });
    }

    // 删除数据库记录
    await Match.delete(matchId);

    res.json({
      code: 200,
      message: 'Match删除成功',
      data: null
    });
  } catch (error) {
    console.error('删除match失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除match失败',
      data: null
    });
  }
});

// 添加玩家到match
router.post('/:matchId/players', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { playerType, playerId, playerName, seatIndex, aiConfig = {} } = req.body;

    if (!playerType || !['human', 'ai'].includes(playerType)) {
      return res.status(400).json({
        code: 400,
        message: '玩家类型必须是human或ai',
        data: null
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        code: 404,
        message: 'Match不存在',
        data: null
      });
    }

    // 只能在等待状态下添加玩家
    if (match.status !== 'waiting') {
      return res.status(400).json({
        code: 400,
        message: '只能在等待状态下添加玩家',
        data: null
      });
    }

    // 权限检查
    const isCreator = await Match.isCreator(matchId, req.user.id);
    
    if (playerType === 'human') {
      // 添加人类玩家：只能添加自己
      if (playerId && playerId !== req.user.id) {
        return res.status(403).json({
          code: 403,
          message: '不能添加其他用户作为玩家',
          data: null
        });
      }

      // 检查用户是否已经在match中
      const existingPlayer = await MatchPlayer.isUserInMatch(req.user.id, matchId);
      if (existingPlayer) {
        return res.status(400).json({
          code: 400,
          message: '您已经在此match中',
          data: null
        });
      }
    } else if (playerType === 'ai') {
      // 添加AI玩家：只有创建者可以添加
      if (!isCreator) {
        return res.status(403).json({
          code: 403,
          message: '只有创建者可以添加AI玩家',
          data: null
        });
      }

      if (!playerId) {
        return res.status(400).json({
          code: 400,
          message: 'AI玩家必须指定AI类型ID',
          data: null
        });
      }

      // 验证AI类型存在
      const aiTypeResult = await query('SELECT * FROM ai_types WHERE id = $1 AND status = $2', [playerId, 'active']);
      if (aiTypeResult.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: 'AI类型不存在',
          data: null
        });
      }
    }

    // 确定座位
    let targetSeatIndex = seatIndex;
    if (targetSeatIndex === undefined || targetSeatIndex === null) {
      console.log('自动分配座位...');
      targetSeatIndex = await MatchPlayer.getNextAvailableSeat(matchId);
      console.log('分配到座位:', targetSeatIndex);
      if (targetSeatIndex === -1) {
        return res.status(400).json({
          code: 400,
          message: 'Match已满',
          data: null
        });
      }
    } else {
      // 检查指定座位是否可用
      console.log('检查指定座位可用性:', targetSeatIndex);
      const isSeatAvailable = await MatchPlayer.isSeatAvailable(matchId, targetSeatIndex);
      console.log('座位可用性:', isSeatAvailable);
      if (!isSeatAvailable) {
        return res.status(400).json({
          code: 400,
          message: '指定座位已被占用',
          data: null
        });
      }
    }

    // 创建玩家数据
    const playerData = {
      matchId,
      seatIndex: targetSeatIndex,
      playerType,
      playerName: playerName || (playerType === 'human' ? req.user.username : `AI-${playerId}`),
      aiConfig
    };

    if (playerType === 'human') {
      playerData.userId = req.user.id;
    } else {
      playerData.aiTypeId = parseInt(playerId);
    }

    // 添加玩家到数据库
    const player = await MatchPlayer.addPlayer(playerData);

    // 同时在boardgame.io中加入玩家
    try {
      // 获取boardgame.io的真实match ID
      const bgioMatchResult = await query('SELECT bgio_match_id FROM matches WHERE id = $1', [matchId]);
      const bgioMatchId = bgioMatchResult.rows[0]?.bgio_match_id;
      
      if (!bgioMatchId) {
        throw new Error('未找到boardgame.io match ID');
      }
      
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      const joinUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/join`;
      
      console.log('尝试加入boardgame.io match:', { 
        joinUrl, 
        playerData, 
        ourMatchId: matchId, 
        bgioMatchId 
      });
      
      const bgioResponse = await fetch(joinUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerID: targetSeatIndex.toString(),
          playerName: playerData.playerName
        })
      });

      console.log('boardgame.io加入响应状态:', bgioResponse.status);

      if (!bgioResponse.ok) {
        const errorText = await bgioResponse.text();
        console.error('加入boardgame.io match失败:', bgioResponse.status, errorText);
        // 如果boardgame.io加入失败，删除数据库记录
        await MatchPlayer.removePlayer(matchId, player.id);
        throw new Error(`加入游戏match失败: ${bgioResponse.status} - ${errorText}`);
      }

      const bgioData = await bgioResponse.json();
      console.log('boardgame.io加入成功:', bgioData);
    } catch (error) {
      console.error('加入boardgame.io match失败:', error.message);
      await MatchPlayer.removePlayer(matchId, player.id);
      return res.status(500).json({
        code: 500,
        message: '加入游戏match失败: ' + error.message,
        data: null
      });
    }

    // 检查是否可以开始游戏
    const canStart = await Match.canStart(matchId);
    if (canStart && match.auto_start) {
      await Match.updateStatus(matchId, 'playing', req.user.id, '自动开始游戏');
    }

    // 获取boardgame.io match ID用于前端
    const bgioMatchResult = await query('SELECT bgio_match_id FROM matches WHERE id = $1', [matchId]);
    const bgioMatchId = bgioMatchResult.rows[0]?.bgio_match_id;

    res.status(201).json({
      code: 200,
      message: '玩家添加成功',
      data: {
        ...player.getDisplayInfo(),
        bgioMatchId: bgioMatchId // 返回boardgame.io的真实match ID
      }
    });
  } catch (error) {
    console.error('添加玩家失败:', error);
    res.status(500).json({
      code: 500,
      message: '添加玩家失败',
      data: null
    });
  }
});

// 移除玩家
router.delete('/:matchId/players/:playerId', async (req, res) => {
  try {
    const { matchId, playerId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        code: 404,
        message: 'Match不存在',
        data: null
      });
    }

    // 游戏进行中不能移除玩家
    if (match.status === 'playing') {
      return res.status(400).json({
        code: 400,
        message: '游戏进行中不能移除玩家',
        data: null
      });
    }

    const player = await MatchPlayer.findById(playerId);
    if (!player || player.match_id !== matchId) {
      return res.status(404).json({
        code: 404,
        message: '玩家不存在',
        data: null
      });
    }

    // 权限检查
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!player.canBeRemoved(req.user.id, isCreator)) {
      return res.status(403).json({
        code: 403,
        message: '没有权限移除此玩家',
        data: null
      });
    }

    // 移除玩家
    await MatchPlayer.removePlayer(matchId, playerId);

    res.json({
      code: 200,
      message: '玩家移除成功',
      data: null
    });
  } catch (error) {
    console.error('移除玩家失败:', error);
    res.status(500).json({
      code: 500,
      message: '移除玩家失败',
      data: null
    });
  }
});

// 开始match
router.post('/:matchId/start', async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        code: 404,
        message: 'Match不存在',
        data: null
      });
    }

    // 只有创建者可以开始游戏
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!isCreator) {
      return res.status(403).json({
        code: 403,
        message: '只有创建者可以开始游戏',
        data: null
      });
    }

    // 检查是否可以开始
    const canStart = await Match.canStart(matchId);
    if (!canStart) {
      return res.status(400).json({
        code: 400,
        message: 'Match不满足开始条件',
        data: null
      });
    }

    // 更新状态
    await Match.updateStatus(matchId, 'playing', req.user.id, '手动开始游戏');

    res.json({
      code: 200,
      message: '游戏开始',
      data: null
    });
  } catch (error) {
    console.error('开始游戏失败:', error);
    res.status(500).json({
      code: 500,
      message: '开始游戏失败',
      data: null
    });
  }
});

// 取消match
router.post('/:matchId/cancel', async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        code: 404,
        message: 'Match不存在',
        data: null
      });
    }

    // 只有创建者可以取消游戏
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '只有创建者可以取消游戏',
        data: null
      });
    }

    // 已结束的游戏不能取消
    if (match.status === 'finished') {
      return res.status(400).json({
        code: 400,
        message: '已结束的游戏不能取消',
        data: null
      });
    }

    // 更新状态
    await Match.updateStatus(matchId, 'cancelled', req.user.id, '游戏被取消');

    res.json({
      code: 200,
      message: '游戏已取消',
      data: null
    });
  } catch (error) {
    console.error('取消游戏失败:', error);
    res.status(500).json({
      code: 500,
      message: '取消游戏失败',
      data: null
    });
  }
});

module.exports = router;