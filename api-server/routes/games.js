const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// 从Game Server获取实际可玩的游戏列表
async function getAvailableGamesFromGameServer() {
  try {
    const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
    const { request } = require('undici'); // 使用已有的undici依赖
    const { body } = await request(`${gameServerUrl}/api/games`);
    const result = await body.json();
    
    if (result.code === 200) {
      return result.data || [];
    }
    return [];
  } catch (error) {
    console.error('从Game Server获取游戏列表失败:', error);
    return [];
  }
}

// 获取游戏列表（合并数据库元信息和Game Server实际可玩游戏）
router.get('/', async (req, res) => {
  try {
    // 并行获取数据库元信息和Game Server实际可玩游戏
    const [dbResult, availableGames] = await Promise.all([
      query(`
        SELECT id, name, description, min_players, max_players, status, created_at
        FROM games
        WHERE status = 'active'
        ORDER BY name
      `),
      getAvailableGamesFromGameServer()
    ]);
    
    // 创建实际可玩游戏的Map
    const availableGameIds = new Set(availableGames.map(game => game.id));
    
    // 合并数据：数据库元信息 + 实际可玩状态
    const mergedGames = dbResult.rows.map(dbGame => ({
      ...dbGame,
      isAvailable: availableGameIds.has(dbGame.id), // 标记是否实际可玩
      displayName: availableGames.find(ag => ag.id === dbGame.id)?.name || dbGame.name
    }));
    
    // 添加Game Server中有但数据库中没有的游戏（作为临时游戏）
    const dbGameIds = new Set(dbResult.rows.map(game => game.id));
    const onlyInGameServer = availableGames.filter(game => !dbGameIds.has(game.id));
    
    onlyInGameServer.forEach(game => {
      mergedGames.push({
        id: game.id,
        name: game.name,
        displayName: game.name,
        description: `临时游戏：${game.name}`,
        min_players: 2,
        max_players: 2,
        status: 'active',
        isAvailable: true,
        isTemporary: true, // 标记为临时游戏
        created_at: new Date().toISOString()
      });
    });
    
    // 只返回实际可玩的游戏
    const playableGames = mergedGames.filter(game => game.isAvailable);
    
    res.json({
      code: 200,
      message: '获取游戏列表成功',
      data: playableGames,
      meta: {
        totalInDb: dbResult.rows.length,
        availableInGameServer: availableGames.length,
        playable: playableGames.length
      }
    });
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取游戏列表失败',
      data: null
    });
  }
});

// 根据ID获取游戏详情
router.get('/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    const result = await query(
      'SELECT * FROM games WHERE id = $1 AND status = $2',
      [gameId, 'active']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '游戏不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: '获取游戏详情成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取游戏详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取游戏详情失败',
      data: null
    });
  }
});

module.exports = router; 