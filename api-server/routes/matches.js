const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const controller = require('../controllers/matchesController');

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
router.get('/', controller.listMatches);

// 创建新match
router.post('/', controller.createMatch);

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
router.delete('/:matchId', controller.deleteMatch);

// 添加玩家到match
router.post('/:matchId/players', controller.addPlayer);

// 移除玩家
router.delete('/:matchId/players/:playerId', controller.removePlayer);
// 管理员强制移除玩家 - 使用统一的 removePlayer 接口
router.post('/:matchId/force-leave', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '只有管理员可以强制玩家离开游戏', data: null });
  }
  // 将 POST 请求转换为 DELETE 请求的参数格式
  req.params.playerId = req.body.playerId;
  next();
}, controller.removePlayer);

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