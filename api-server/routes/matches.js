const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const Match = require('../models/Match');
const MatchPlayer = require('../models/MatchPlayer');
const Game = require('../models/Game');

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
    const game = await Game.findByIdAndStatus(gameType, 'active');
    if (!game) {
      return res.status(404).json({
        code: 404,
        message: '游戏类型不存在',
        data: null
      });
    }

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
      
      // 获取AI玩家信息
      const aiPlayers = await Match.getAIPlayers(matchId);
      console.log('获取到AI玩家信息:', aiPlayers);
      
      console.log('尝试创建boardgame.io match:', { createUrl, matchId, gameType, aiPlayers });
      
      const bgioResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchID: matchId,
          numPlayers: game.max_players,
          setupData: {
            ...gameConfig,
            matchId: matchId,  // 传递matchId给游戏逻辑
            aiPlayers: aiPlayers  // 传递AI玩家信息
          }
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
        await Match.updateBgioMatchId(matchId, bgioData.matchID);
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

    // 注释掉删除进行中match的限制，允许创建者随时删除（解决match卡死问题）
    // if (match.status === 'playing') {
    //   return res.status(400).json({
    //     code: 400,
    //     message: '无法删除进行中的match',
    //     data: null
    //   });
    // }

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
    
    // 检查是否有已存在的玩家记录（用于重新加入逻辑）
    let existingPlayer = null;
    
    // 确定座位索引
    let targetSeatIndex = seatIndex;
    
    if (playerType === 'human') {
      // 添加人类玩家：只能添加自己
      if (playerId && playerId !== req.user.id) {
        return res.status(403).json({
          code: 403,
          message: '不能添加其他用户作为玩家',
          data: null
        });
      }

      // 检查用户是否已经在当前match中
      existingPlayer = await MatchPlayer.findByUserAndMatch(req.user.id, matchId);
      if (existingPlayer) {
        if (existingPlayer.status === 'joined') {
          return res.status(400).json({
            code: 400,
            message: '您已经在此match中',
            data: null
          });
        }
        // 如果玩家之前离开了，尝试重用原来的座位
        if (existingPlayer.status === 'left') {
          targetSeatIndex = existingPlayer.seat_index;
          console.log('检测到玩家重新加入，重用座位:', targetSeatIndex);
        }
      }

      // 检查用户是否已经在其他活跃的match中
      const userActiveMatches = await MatchPlayer.findActiveMatchesByUserId(req.user.id);

      if (userActiveMatches.length > 0) {
        const activeMatch = userActiveMatches[0];
        return res.status(400).json({
          code: 400,
          message: `您已经在另一个match中（ID: ${activeMatch.match_id.substring(0, 8)}...），请先离开该match再加入新的match`,
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
      const aiTypeResult = await Match.findAITypeById(parseInt(playerId));
      if (!aiTypeResult) {
        return res.status(404).json({
          code: 404,
          message: 'AI类型不存在',
          data: null
        });
      }

      // 检查是否有同类型AI之前离开过，可以重用座位
      const existingAIResult = await MatchPlayer.findExistingAIPlayer(matchId, parseInt(playerId));

      if (existingAIResult) {
        existingPlayer = existingAIResult;
        targetSeatIndex = existingPlayer.seat_index;
        console.log('检测到AI重新加入，重用座位:', targetSeatIndex);
      }
    }

    // 确定座位（在人类玩家加入逻辑之后）
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
      // 检查指定座位是否可用（除非是重新加入的玩家重用自己的座位）
      console.log('检查指定座位可用性:', targetSeatIndex);
      const isSeatAvailable = await MatchPlayer.isSeatAvailable(matchId, targetSeatIndex);
      console.log('座位可用性:', isSeatAvailable);
      if (!isSeatAvailable && !(existingPlayer && existingPlayer.status === 'left' && existingPlayer.seat_index === targetSeatIndex)) {
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
      const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
      
      if (!bgioMatchId) {
        throw new Error('未找到boardgame.io match ID');
      }
      
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      
      // 如果是重新加入（existingPlayer存在且为left状态），先尝试强制更新boardgame.io状态
      if (existingPlayer && existingPlayer.status === 'left') {
        console.log('检测到重新加入，尝试强制更新boardgame.io状态');
        
        // 先尝试leave操作确保座位释放
        try {
          const leaveUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/leave`;
          const leaveResponse = await fetch(leaveUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              playerID: targetSeatIndex.toString()
            })
          });
          console.log('强制leave响应状态:', leaveResponse.status);
        } catch (leaveError) {
          console.log('强制leave失败，继续尝试join:', leaveError.message);
        }
      }
      
      const joinUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/join`;
      
      console.log('尝试加入boardgame.io match:', { 
        joinUrl, 
        playerData, 
        ourMatchId: matchId, 
        bgioMatchId,
        isRejoin: existingPlayer && existingPlayer.status === 'left'
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
        
        // 如果是409错误且是重新加入，尝试使用更新玩家API而不是加入API
        if (bgioResponse.status === 409 && existingPlayer && existingPlayer.status === 'left') {
          console.log('尝试使用更新玩家API代替加入API');
          
          // 尝试直接更新玩家信息而不是加入
          const updateUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/update`;
          
          try {
            const updateResponse = await fetch(updateUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerID: targetSeatIndex.toString(),
                playerName: playerData.playerName
              })
            });
            
            console.log('boardgame.io更新响应状态:', updateResponse.status);
            
            if (updateResponse.ok) {
              const updateData = await updateResponse.json();
              console.log('boardgame.io更新成功:', updateData);
            } else {
              // 更新也失败，那就强制认为成功（数据库已经更新了）
              console.log('更新API也失败，但数据库已更新，继续执行');
            }
          } catch (updateError) {
            console.log('更新API调用出错，但数据库已更新，继续执行:', updateError.message);
          }
        } else {
          // 如果不是重新加入的409错误，则删除数据库记录并失败
          await MatchPlayer.removePlayer(matchId, player.id);
          throw new Error(`加入游戏match失败: ${bgioResponse.status} - ${errorText}`);
        }
      } else {
        const bgioData = await bgioResponse.json();
        console.log('boardgame.io加入成功:', bgioData);
        
        // 保存playerCredentials到数据库
        if (bgioData.playerCredentials) {
          await MatchPlayer.updatePlayerCredentials(matchId, req.user.id, bgioData.playerCredentials);
          console.log('已保存playerCredentials to database');
        }
      }
    } catch (error) {
      console.error('加入boardgame.io match失败:', error.message);
      
      // 如果是重新加入且boardgame.io失败，不删除数据库记录，认为成功
      if (existingPlayer && existingPlayer.status === 'left') {
        console.log('重新加入时boardgame.io失败，但保留数据库记录，认为成功');
      } else {
        // 只有新加入时才删除数据库记录
        await MatchPlayer.removePlayer(matchId, player.id);
        return res.status(500).json({
          code: 500,
          message: '加入游戏match失败: ' + error.message,
          data: null
        });
      }
    }

    // 检查是否可以开始游戏
    const canStart = await Match.canStart(matchId);
    if (canStart && match.auto_start) {
      await Match.updateStatus(matchId, 'playing', req.user.id, '自动开始游戏');
    }

    // 获取boardgame.io match ID用于前端
    const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);

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

    // 注释掉游戏进行中的限制，允许玩家随时离开（解决match卡死问题）
    // if (match.status === 'playing') {
    //   return res.status(400).json({
    //     code: 400,
    //     message: '游戏进行中不能移除玩家',
    //     data: null
    //   });
    // }

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

    // 同时从boardgame.io中移除玩家
    try {
      console.log('准备从boardgame.io移除玩家:', {
        playerId,
        playerType: player.player_type,
        seatIndex: player.seat_index,
        matchId,
        playerName: player.player_name
      });
      
      const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
      
      console.log('查询boardgame.io match ID结果:', { bgioMatchId, hasResult: !!bgioMatchId });
      
      if (bgioMatchId) {
        const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
        const leaveUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/leave`;
        
        console.log('尝试从boardgame.io移除玩家:', { 
          leaveUrl, 
          playerID: player.seat_index.toString(),
          bgioMatchId,
          gameId: match.game_id
        });
        
        const bgioResponse = await fetch(leaveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            playerID: player.seat_index.toString()
          })
        });

        console.log('boardgame.io移除响应状态:', bgioResponse.status);
        
        if (!bgioResponse.ok) {
          const errorText = await bgioResponse.text();
          console.error('从boardgame.io移除玩家失败:', bgioResponse.status, errorText);
          // 不要因为boardgame.io错误而失败，因为数据库已经更新了
        } else {
          console.log('成功从boardgame.io移除玩家');
        }
      }
    } catch (error) {
      console.error('从boardgame.io移除玩家时出错:', error.message);
      // 不要因为boardgame.io错误而失败，因为数据库已经更新了
    }

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

    // 获取match的bgio_match_id
    const bgioMatchId = match.bgio_match_id;
    if (!bgioMatchId) {
      return res.status(400).json({
        code: 400,
        message: 'boardgame.io match ID不存在',
        data: null
      });
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