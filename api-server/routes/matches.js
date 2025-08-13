const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const {ok, badRequest, forbidden, notFound, serverError} = require('./_base');
const Game = require('../models/Game');

// 为尚未迁移到controller的路由保留所需依赖
const Match = require('../models/Match');
const MatchPlayer = require('../models/MatchPlayer');
const { fetch } = require('undici');

// 更新match状态（内部服务调用，无需认证）
router.put('/:matchId/status', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        code: 400,
        message: '缺少status参数',
        data: null
      });
    }
    
    console.log(`🔄 [Match API] 更新状态: ${matchId} -> ${status}`);
    
    await Match.updateStatus(matchId, status, null, notes);
    
    res.json({
      code: 200,
      message: 'Match状态更新成功',
      data: { matchId, status, notes }
    });
    
  } catch (error) {
    console.error('❌ [Match API] 更新状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新状态失败',
      data: null
    });
  }
});

// 以下路由需要认证
router.use(authenticateToken);

// 获取match列表
router.get('/', async (req, res) => {
  try {
    console.log('🔍 获取match列表请求:', {
      query: req.query,
      user: req.user.username
    });
    
    const { gameId, status, includeMyMatches } = req.query;
    const filters = {};
    if (gameId) filters.gameId = gameId;
    if (status) filters.status = status;

    console.log('🎯 查询过滤器:', filters);

    let matches;
    if (includeMyMatches === 'true') {
      matches = await Match.findActiveByUser(req.user.id);
    } else {
      matches = await Match.findAll(filters);
    }
    
    console.log('📋 查询到的matches数量:', matches.length);

    const matchesWithPlayers = await Promise.all(
      matches.map(async (match) => {
        const players = await MatchPlayer.findByMatchId(match.id);
        return {
          ...match,
          players: players.map((p) => p.getDisplayInfo()),
          currentPlayerCount: players.length,
        };
      })
    );
    return ok(res, matchesWithPlayers, '获取match列表成功');
  } catch (error) {
    console.error('获取match列表失败:', error);
    return serverError(res, '获取match列表失败');
  }
});

// 创建新match
router.post('/', async (req, res) => {
  try {
    console.log('🎯 收到创建match请求:', {
      body: req.body,
      user: req.user,
      headers: req.headers['content-type']
    });
    
    const { gameId, gameConfig = {} } = req.body;
    if (!gameId) return badRequest(res, '游戏Id不能为空');

    const game = await Game.findByIdAndStatus(gameId, 'active');
    if (!game) {
      console.log('❌ 游戏Id不存在或者未激活:', gameId);
      return notFound(res, `游戏${gameId}不存在或者未激活`);
    }

    const matchId = uuidv4();
    console.log('🆔 生成match ID:', matchId);

    const match = await Match.create({
      id: matchId,
      gameId: gameId,
      creatorId: req.user.id,
      maxPlayers: game.max_players,
      minPlayers: game.min_players,
      gameConfig,
    });
    console.log('✅ 数据库match创建成功:', match.id);

    try {
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
  
      // 直接请求 REST API
      const response = await fetch(`${gameServerUrl}/games/${gameId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numPlayers: game.max_players,
          setupData: {
            matchId: matchId,
          },
          unlisted: false
        })
      });

      if (!response.ok) {
        throw new Error(`创建 match 失败: HTTP ${response.status}`);
      }
    
      const data = await response.json();
      const bgioMatchId = data.matchID;
      if (bgioMatchId) {
        console.log('🎮 保存boardgame.io match ID:', bgioMatchId);
        try {
          await Match.updateBgioMatchId(matchId, bgioMatchId);
          console.log('✅ boardgame.io match ID保存成功');
        } catch (updateErr) {
          console.error('❌ 保存boardgame.io match ID失败:', updateErr.message);
          throw updateErr;
        }
      }
    } catch (err) {
      console.error('❌ 创建boardgame.io match过程失败:', err.message);
      console.log('设置数据库中的match记录status=error:', matchId);
      await Match.updateStatus(matchId, 'error', 'system', err.message);
      return serverError(res, '创建游戏match失败: ' + err.message);
    }

    const matchInfo = await Match.findById(matchId);
    if (!matchInfo) {
      console.error('❌ 严重错误: 刚创建的match竟然找不到!');
      return serverError(res, 'Match创建后立即丢失');
    }
    
    return ok(res, matchInfo, 'Match创建成功');
  } catch (error) {
    console.error('创建match失败:', error);
    return serverError(res, '创建match失败');
  }
});

// 获取当前用户在match中的playerCredentials
router.get('/:matchId/credentials', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // 查询当前用户在此match中的playerCredentials
    // 支持两种ID格式：UUID（我们的数据库ID）和短ID（boardgame.io ID）
    let result;
    
    // 首先尝试作为我们数据库的UUID查找
    result = await MatchPlayer.findByUserIdAndMatchId(req.user.id, matchId);
    
    // 如果没找到，尝试通过bgio_match_id查找
    if (!result) {
      result = await MatchPlayer.findByBgioMatchIdAndUserId(matchId, req.user.id);
    }
    
    if (!result) {
      return res.status(404).json({
        code: 404,
        message: '您不在此match中',
        data: null
      });
    }
    
    const playerData = result;
    
    if (!playerData.player_credentials) {
      return res.status(404).json({
        code: 404,
        message: 'playerCredentials未找到，请重新加入match',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: '获取playerCredentials成功',
      data: {
        playerCredentials: playerData.player_credentials,
        playerID: playerData.seat_index.toString()
      }
    });
  } catch (error) {
    console.error('获取playerCredentials失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取playerCredentials失败',
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
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!isCreator && req.user.role !== 'admin') {
      return forbidden(res, '没有权限删除此match');
    }

    const match = await Match.findById(matchId);
    if (!match) return notFound(res, 'Match不存在');

    await Match.delete(matchId);
    return ok(res, null, 'Match删除成功');
  } catch (error) {
    console.error('删除match失败:', error);
    return serverError(res, '删除match失败');
  }
});

// 添加玩家到match
router.post('/:matchId/players', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { playerId, seatIndex } = req.body;
    
    if (!playerId) {
      return badRequest(res, '必须提供playerId');
    }

    const match = await Match.findById(matchId);
    if (!match) return notFound(res, 'Match不存在');
    if (match.status !== 'waiting') return badRequest(res, '只能在等待状态下添加玩家');

    // 验证玩家存在
    const result = await query('SELECT * FROM players WHERE id = $1', [playerId]);
    if (result.rows.length === 0) {
      return notFound(res, '玩家不存在');
    }
    const player = result.rows[0];
    
    // 权限检查：创建者可以添加任何玩家，普通用户只能添加自己的玩家
    const isCreator = await Match.isCreator(matchId, req.user.id);
    const isOwnPlayer = player.user_id === req.user.id;
    
    if (!isCreator && !isOwnPlayer) {
      return forbidden(res, '没有权限添加该玩家');
    }
    
    // 检查玩家是否已在其他match中
    const activeMatches = await MatchPlayer.findActiveMatchesByPlayerId(playerId);
    if (activeMatches.length > 0) {
      return badRequest(res, `该玩家已在其他match中`);
    }
    
    // 使用统一的添加方法
    const addedPlayer = await MatchPlayer.addPlayerById(matchId, playerId, seatIndex);
    
    // 同步到boardgame.io
    try {
      const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
      if (bgioMatchId) {
        const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
        const joinUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/join`;
        
        const resp = await fetch(joinUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerID: addedPlayer.seat_index.toString(),
            playerName: addedPlayer.player_name,
            data: { "hello": "world" }
          })
        });
        
        if (resp.ok) {
          const data = await resp.json();
          if (data.playerCredentials) {
            await MatchPlayer.updatePlayerCredentialsByPlayerId(addedPlayer.id, data.playerCredentials);
          }
        } else {
          //await MatchPlayer.removePlayer(matchId, addedPlayer.id);
          const txt = await resp.text();
          return serverError(res, `boardgame.io同步失败, ${resp.status} - ${txt}`);
        }
      }
    } catch (error) {
      await MatchPlayer.removePlayer(matchId, addedPlayer.id);
      return serverError(res, `游戏服务器连接失败 - ${error}`);
    }

    // 检查是否可以自动开始
    if (match.auto_start && await Match.canStart(matchId)) {
      await Match.updateStatus(matchId, 'playing', req.user.id, '自动开始游戏');
    }

    return ok(res, addedPlayer.getDisplayInfo(), '玩家添加成功');
  } catch (error) {
    console.error('添加玩家失败:', error);
    return serverError(res, '添加玩家失败');
  }
});

// 移除玩家
router.delete('/:matchId/players/:playerId', async (req, res) => {
  try {
    const { matchId, playerId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) return notFound(res, 'Match不存在');

    const player = await MatchPlayer.findById(playerId);
    if (!player || player.match_id !== matchId) return notFound(res, '玩家不存在');

    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!player.canBeRemoved(req.user.id, isCreator)) return forbidden(res, '没有权限移除此玩家');

    // 移除玩家
    await MatchPlayer.removePlayer(matchId, player.id);

    // 同步boardgame.io
    try {
      const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
      if (bgioMatchId) {
        const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
        const leaveUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/leave`;
        const leaveBody = player.player_credentials
          ? { playerID: player.seat_index.toString(), credentials: player.player_credentials }
          : { playerID: player.seat_index.toString() };
        await fetch(leaveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaveBody)
        });
      }
    } catch (e) {
      console.warn('boardgame.io同步失败（忽略）:', e.message);
    }

    return ok(res, null, '玩家移除成功');
  } catch (error) {
    console.error('移除玩家失败:', error);
    return serverError(res, '移除玩家失败');
  }
});

// 开始match
router.post('/:matchId/start', async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return notFound(res, 'Match不存在');
    }

    // 只有创建者可以开始游戏
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!isCreator) {
      return forbidden(res, '只有创建者可以开始游戏');
    }

    // 检查是否可以开始
    const canStart = await Match.canStart(matchId);
    if (!canStart) {
      return badRequest(res, 'Match不满足开始条件');
    }

    // 获取match的bgio_match_id
    const bgioMatchId = match.bgio_match_id;
    if (!bgioMatchId) {
      return badRequest(res, 'boardgame.io match ID不存在');
    }

    // 初始化boardgame.io游戏状态 - 通过模拟第一个玩家的连接
    try {
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      
      // 获取第一个玩家（通常是seat_index=0）
      const firstPlayer = await MatchPlayer.findFirstPlayerByMatchId(matchId);
      
      if (!firstPlayer) {
        throw new Error('没有找到玩家');
      }
      
      console.log('🎮 [Start Match] 初始化boardgame.io游戏状态，首个玩家:', firstPlayer);
      
      // 通过获取游戏状态来触发初始化（如果不存在会自动创建）
      const initUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/${firstPlayer.seat_index}`;
      
      const initResponse = await fetch(initUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🎮 [Start Match] boardgame.io初始化响应状态:', initResponse.status);
      
      if (initResponse.ok) {
        const gameState = await initResponse.json();
        console.log('✅ [Start Match] boardgame.io游戏状态已初始化，当前玩家:', gameState.ctx?.currentPlayer);
      } else {
        console.log('⚠️ [Start Match] boardgame.io初始化返回:', initResponse.status, '可能游戏已存在');
      }
      
    } catch (error) {
      console.error('❌ [Start Match] 初始化boardgame.io失败:', error.message);
      // 不阻止match开始，游戏状态可能在玩家连接时自动创建
    }

    // 更新数据库状态并设置started_at
    await Match.updateStatus(matchId, 'playing', req.user.id, '自动开始游戏');
    
    console.log('✅ [Start Match] 游戏已开始，match:', matchId, 'bgio:', bgioMatchId);

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

// 检查游戏状态并更新match状态
router.post('/:matchId/check-game-status', async (req, res) => {
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

    // 只检查进行中的游戏
    if (match.status !== 'playing') {
      return res.json({
        code: 200,
        message: 'Match不在进行中',
        data: { status: match.status }
      });
    }

    // 获取boardgame.io的游戏状态
    try {
      const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
      
      if (!bgioMatchId) {
        return res.status(404).json({
          code: 404,
          message: '未找到boardgame.io match ID',
          data: null
        });
      }

      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      const statusUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}`;
      
      console.log('检查游戏状态:', { statusUrl, bgioMatchId });
      
      const bgioResponse = await fetch(statusUrl);
      
      if (!bgioResponse.ok) {
        const errorText = await bgioResponse.text();
        console.error('获取游戏状态失败:', bgioResponse.status, errorText);
        return res.status(500).json({
          code: 500,
          message: '获取游戏状态失败',
          data: null
        });
      }

      const gameState = await bgioResponse.json();
      console.log('游戏状态:', gameState);
      
      // 检查游戏是否结束
      if (gameState.ctx && gameState.ctx.gameover) {
        console.log('检测到游戏结束:', gameState.ctx.gameover);
        
        // 更新match状态为finished
        await Match.updateStatus(matchId, 'finished', req.user.id, `游戏结束: ${JSON.stringify(gameState.ctx.gameover)}`);
        
        return res.json({
          code: 200,
          message: '游戏已结束，match状态已更新',
          data: { 
            status: 'finished',
            gameResult: gameState.ctx.gameover
          }
        });
      } else {
        return res.json({
          code: 200,
          message: '游戏仍在进行中',
          data: { 
            status: 'playing',
            gameState: gameState
          }
        });
      }
    } catch (error) {
      console.error('检查游戏状态时出错:', error.message);
      return res.status(500).json({
        code: 500,
        message: '检查游戏状态失败: ' + error.message,
        data: null
      });
    }
  } catch (error) {
    console.error('检查游戏状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '检查游戏状态失败',
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