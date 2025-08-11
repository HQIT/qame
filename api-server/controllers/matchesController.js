const { v4: uuidv4 } = require('uuid');
const { fetch } = require('undici');
const { query } = require('../config/database');
const Match = require('../models/Match');
const MatchPlayer = require('../models/MatchPlayer');
const Game = require('../models/Game');
const AiClient = require('../models/AiClient');

function ok(res, data, message = 'OK') {
  return res.json({ code: 200, message, data });
}
function badRequest(res, message) {
  return res.status(400).json({ code: 400, message, data: null });
}
function forbidden(res, message) {
  return res.status(403).json({ code: 403, message, data: null });
}
function notFound(res, message) {
  return res.status(404).json({ code: 404, message, data: null });
}
function serverError(res, message) {
  return res.status(500).json({ code: 500, message, data: null });
}

// 从 boardgame.io 同步 match 状态
async function syncMatchesFromBoardgameIO() {
  try {
    console.log('🔄 开始同步 boardgame.io 数据...');
    
    // 获取所有活跃的 matches
    const activeMatches = await Match.findAll({ status: ['waiting', 'playing'] });
    console.log(`📊 找到 ${activeMatches.length} 个活跃 matches`);
    
    const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
    
    for (const match of activeMatches) {
      if (!match.bgio_match_id) continue;
      
      try {
        // 获取 boardgame.io 中的 match 状态
        const bgioUrl = `${gameServerUrl}/games/${match.game_id}/${match.bgio_match_id}`;
        const response = await fetch(bgioUrl);
        
        if (!response.ok) {
          console.warn(`⚠️ 无法获取 bgio match ${match.bgio_match_id}: ${response.status}`);
          continue;
        }
        
        const bgioData = await response.json();
        console.log(`🎮 同步 match ${match.id}: ${JSON.stringify(bgioData.ctx?.gameover || 'ongoing')}`);
        
        // 同步 match 状态
        const newStatus = bgioData.ctx?.gameover ? 'finished' : 'playing';
        if (match.status !== newStatus) {
          await Match.updateStatus(match.id, newStatus, null, `从 boardgame.io 同步: ${match.status} → ${newStatus}`);
          console.log(`✅ 更新 match ${match.id} 状态: ${match.status} → ${newStatus}`);
        }
        
        // 同步玩家状态（简化版：检查哪些玩家还在游戏中）
        if (bgioData.players) {
          await syncMatchPlayers(match.id, bgioData.players);
        }
        
      } catch (err) {
        console.warn(`⚠️ 同步 match ${match.id} 失败:`, err.message);
      }
    }
    
    console.log('✅ boardgame.io 数据同步完成');
  } catch (error) {
    console.error('❌ 同步 boardgame.io 数据失败:', error);
  }
}

// 同步玩家状态
async function syncMatchPlayers(matchId, bgioPlayers) {
  try {
    const currentPlayers = await MatchPlayer.findByMatchId(matchId);
    
    // 检查哪些玩家在 boardgame.io 中已经不存在了
    for (const player of currentPlayers) {
      const seatIndex = player.seat_index;
      const bgioPlayer = bgioPlayers[seatIndex];
      
      // 如果 boardgame.io 中该座位为空，但 api-server 中显示有人
      if (!bgioPlayer && player.status === 'joined') {
        console.log(`🚪 玩家 ${player.player_name} 已从 boardgame.io 中离开，更新状态`);
        await MatchPlayer.removePlayer(matchId, player.id);
      }
    }
  } catch (error) {
    console.warn(`⚠️ 同步玩家状态失败 (match: ${matchId}):`, error.message);
  }
}

// GET /api/matches
exports.listMatches = async (req, res) => {
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
};

// POST /api/matches
exports.createMatch = async (req, res) => {
  try {
    console.log('🎯 收到创建match请求:', {
      body: req.body,
      user: req.user,
      headers: req.headers['content-type']
    });
    
    const { gameType, gameConfig = {}, isPrivate = false, autoStart = false } = req.body;
    if (!gameType) return badRequest(res, '游戏类型不能为空');

    const game = await Game.findByIdAndStatus(gameType, 'active');
    if (!game) {
      console.log('❌ 游戏类型不存在:', gameType);
      return notFound(res, '游戏类型不存在');
    }

    const matchId = uuidv4();
    console.log('🆔 生成match ID:', matchId);

    const match = await Match.create({
      id: matchId,
      gameId: gameType,
      creatorId: req.user.id,
      maxPlayers: game.max_players,
      minPlayers: game.min_players,
      allowSpectators: gameConfig.allowSpectators || false,
      isPrivate,
      autoStart,
      gameConfig,
    });
    console.log('✅ 数据库match创建成功:', match.id);

    try {
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      const createUrl = `${gameServerUrl}/games/${gameType}/create`;
      console.log('🎮 向game-server创建match:', createUrl);
      const requestBody = {
        numPlayers: game.max_players,
        setupData: { 
          allowSpectators: gameConfig.allowSpectators || false,
          matchId: matchId
        },
      };
      console.log('📦 向game-server发送的数据:', JSON.stringify(requestBody, null, 2));
      
      const resp = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      console.log('📡 game-server响应状态:', resp.status, resp.statusText);
      
      if (!resp.ok) {
        const txt = await resp.text();
        console.log('❌ game-server错误响应:', txt);
        await Match.delete(matchId);
        throw new Error(`创建游戏match失败: ${resp.status} - ${txt}`);
      }
      const data = await resp.json();
      console.log('📡 game-server响应数据:', JSON.stringify(data, null, 2));
      if (data.matchID) {
        console.log('🎮 更新boardgame.io match ID:', data.matchID);
        try {
          await Match.updateBgioMatchId(matchId, data.matchID);
          console.log('✅ boardgame.io match ID更新成功');
        } catch (updateErr) {
          console.error('❌ 更新boardgame.io match ID失败:', updateErr.message);
          throw updateErr;
        }
      }
    } catch (err) {
      console.error('❌ 创建boardgame.io match过程失败:', err.message);
      console.error('❌ 错误堆栈:', err.stack);
      console.log('🗑️ 删除数据库中的match记录:', matchId);
      await Match.delete(matchId);
      return serverError(res, '创建游戏match失败: ' + err.message);
    }

    console.log('🔍 查找创建的match:', matchId);
    const matchWithPlayers = await Match.findByIdWithPlayers(matchId);
    console.log('📊 查找结果:', matchWithPlayers ? 'Found' : 'Not Found');
    
    if (!matchWithPlayers) {
      console.error('❌ 严重错误: 刚创建的match竟然找不到!');
      return serverError(res, 'Match创建后立即丢失');
    }
    
    return res.status(201).json({
      code: 200,
      message: 'Match创建成功',
      data: { ...matchWithPlayers, players: [], currentPlayerCount: 0 },
    });
  } catch (error) {
    console.error('创建match失败:', error);
    return serverError(res, '创建match失败');
  }
};

// POST /api/matches/:matchId/players
exports.addPlayer = async (req, res) => {
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
            playerName: addedPlayer.player_name
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
};

// DELETE /api/matches/:matchId
exports.deleteMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const isCreator = await Match.isCreator(matchId, req.user.id);
    if (!isCreator && req.user.role !== 'admin') {
      return forbidden(res, '没有权限删除此match');
    }

    const match = await Match.findById(matchId);
    if (!match) return notFound(res, 'Match不存在');

    // 清理所有AI绑定（ai_clients.match_id/player_id）
    try { await AiClient.clearAssignmentByMatchId(matchId); } catch (_) {}
    await Match.delete(matchId);
    return ok(res, null, 'Match删除成功');
  } catch (error) {
    console.error('删除match失败:', error);
    return serverError(res, '删除match失败');
  }
};

// DELETE /api/matches/:matchId/players/:playerId
exports.removePlayer = async (req, res) => {
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
};

// POST /api/matches/sync
exports.syncMatches = async (req, res) => {
  try {
    console.log('🔄 手动触发 boardgame.io 同步:', req.user.username);
    
    await syncMatchesFromBoardgameIO();
    
    return ok(res, null, 'boardgame.io 数据同步完成');
  } catch (error) {
    console.error('手动同步失败:', error);
    return serverError(res, '同步失败');
  }
};




