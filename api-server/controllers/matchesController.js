const { v4: uuidv4 } = require('uuid');
const { fetch } = require('undici');
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
    const { playerType, playerId, playerName, seatIndex, aiPlayerId } = req.body;
    if (!playerType || !['human', 'ai'].includes(playerType)) return badRequest(res, '玩家类型必须是human或ai');

    const match = await Match.findById(matchId);
    if (!match) return notFound(res, 'Match不存在');
    if (match.status !== 'waiting') return badRequest(res, '只能在等待状态下添加玩家');

    const isCreator = await Match.isCreator(matchId, req.user.id);
    let existingPlayer = null;
    let targetSeatIndex = seatIndex;

    if (playerType === 'human') {
      if (playerId && playerId !== req.user.id) return forbidden(res, '不能添加其他用户作为玩家');
      existingPlayer = await MatchPlayer.findByUserAndMatch(req.user.id, matchId);
      if (existingPlayer) {
        if (existingPlayer.status === 'joined') return badRequest(res, '您已经在此match中');
      }
      const active = await MatchPlayer.findActiveMatchesByUserId(req.user.id);
      if (active.length > 0) return badRequest(res, `您已经在另一个match中（ID: ${active[0].match_id.substring(0, 8)}...），请先离开该match再加入新的match`);
    } else if (playerType === 'ai') {
      if (!isCreator) return forbidden(res, '只有创建者可以添加AI玩家');
      if (!aiPlayerId) return badRequest(res, 'AI玩家必须提供aiPlayerId');
      if (!playerName) return badRequest(res, 'AI玩家必须提供playerName');
      // AI玩家信息通过aiPlayerId从ai-manager获取
    }

    if (targetSeatIndex === undefined || targetSeatIndex === null) {
      targetSeatIndex = await MatchPlayer.getNextAvailableSeat(matchId);
      if (targetSeatIndex === -1) return badRequest(res, 'Match已满');
    } else {
      const isSeatAvailable = await MatchPlayer.isSeatAvailable(matchId, targetSeatIndex);
      if (!isSeatAvailable) {
        return badRequest(res, '指定座位已被占用');
      }
    }

    // 统一 player_name：前端已传递正确的playerName
    const resolvedPlayerName = playerName || (playerType === 'human' ? req.user.username : 'AI Player');

    const playerData = {
      matchId,
      seatIndex: targetSeatIndex,
      playerType,
      playerName: resolvedPlayerName,
    };
    
    if (playerType === 'human') {
      playerData.userId = req.user.id;
    } else if (playerType === 'ai') {
      playerData.aiPlayerId = aiPlayerId;
    }
    // AI不再写入 aiTypeId

    const player = await MatchPlayer.addPlayer(playerData);
    // AI玩家信息已通过aiPlayerId在unified players表中管理，无需额外绑定

    try {
      const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
      if (!bgioMatchId) throw new Error('未找到boardgame.io match ID');
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';

      // left状态处理逻辑已删除

      const joinUrl = `${gameServerUrl}/games/${match.game_id}/${bgioMatchId}/join`;
      console.log('🎯 准备加入match:', {
        joinUrl,
        bgioMatchId,
        targetSeatIndex,
        playerName: playerData.playerName
      });
      
      let resp;
      try {
        console.log('🚀 正在发送join请求...');
        resp = await fetch(joinUrl, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ playerID: targetSeatIndex.toString(), playerName: playerData.playerName }) 
        });
        console.log('📡 join响应状态:', resp.status, resp.statusText);
      } catch (fetchError) {
        console.error('❌ fetch请求异常:', fetchError.message);
        throw new Error(`网络请求失败: ${fetchError.message}`);
      }
      
      if (!resp.ok) {
        const txt = await resp.text();
        console.log('❌ join失败响应:', txt);
        // 简化：不做预清理与重试，直接清理数据库记录并返回错误
        await MatchPlayer.removePlayer(matchId, player.id);
        throw new Error(`加入游戏match失败: ${resp.status} - ${txt}`);
      } else {
        const data = await resp.json();
        // 加入成功后，统一为玩家写入凭证（人类与AI一致处理）
        if (data.playerCredentials) {
          if (playerType === 'human') {
            await MatchPlayer.updatePlayerCredentials(matchId, req.user.id, data.playerCredentials);
          } else if (player && player.id) {
            await MatchPlayer.updatePlayerCredentialsByPlayerId(player.id, data.playerCredentials);
          }
        }
      }
    } catch (err) {
      await MatchPlayer.removePlayer(matchId, player.id);
      return serverError(res, '加入游戏match失败: ' + err.message);
    }

    const canStart = await Match.canStart(matchId);
    if (canStart && match.auto_start) await Match.updateStatus(matchId, 'playing', req.user.id, '自动开始游戏');
    // 主动标记为 playing 的同时，尝试触发一次 AI 检查
    try {
      const aiPing = await fetch(`${process.env.GAME_SERVER_URL || 'http://game-server:8000'}/ai/ping`, {
        headers: { 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY || 'internal-service-secret-key-2024' }
      });
      await aiPing.text();
    } catch (_) {}

    const bgioMatchId = await Match.findBgioMatchIdByMatchId(matchId);
    return res.status(201).json({ code: 200, message: '玩家添加成功', data: { ...player.getDisplayInfo(), bgioMatchId } });
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

    await MatchPlayer.removePlayer(matchId, player.id);
    // 若为AI，清空 ai_clients 绑定
    try {
      if (player.player_type === 'ai') {
        const cfg = typeof player.ai_config === 'string' ? JSON.parse(player.ai_config || '{}') : (player.ai_config || {});
        if (cfg.clientId) await AiClient.clearAssignmentByClientId(cfg.clientId);
      }
    } catch (_) {}

    // 同步boardgame.io（忽略失败）
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
      console.warn('从boardgame.io移除玩家失败（忽略）:', e.message);
    }

    return ok(res, null, '玩家移除成功');
  } catch (error) {
    console.error('移除玩家失败:', error);
    return serverError(res, '移除玩家失败');
  }
};

// POST /api/matches/:matchId/force-leave
exports.forceLeavePlayer = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return badRequest(res, '缺少玩家ID');
    }

    // 查找玩家记录
    const player = await MatchPlayer.findById(playerId);
    if (!player || player.match_id !== matchId) {
      return notFound(res, '该玩家不在此游戏中');
    }

    if (player.status !== 'joined' && player.status !== 'ready' && player.status !== 'playing') {
      return badRequest(res, '该玩家已不在游戏中');
    }

    // 移除玩家
    await MatchPlayer.removePlayer(matchId, player.id);
    // 若为AI，清空 ai_clients 绑定
    try {
      if (player.player_type === 'ai') {
        const cfg = typeof player.ai_config === 'string' ? JSON.parse(player.ai_config || '{}') : (player.ai_config || {});
        if (cfg.clientId) await AiClient.clearAssignmentByClientId(cfg.clientId);
      }
    } catch (_) {}

    // 通知boardgame.io服务器该玩家离开
    try {
      const match = await Match.findById(matchId);
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
    } catch (bgioError) {
      console.error('通知boardgame.io服务器失败:', bgioError);
      // 不影响主要操作，继续执行
    }

    const targetInfo = player.user_id 
      ? `用户ID ${player.user_id}` 
      : `AI ${player.player_name || `seat ${player.seat_index}`}`;
    console.log(`🔨 管理员 ${req.user.username} 强制 ${targetInfo} 离开游戏 ${matchId}`);
    
    return res.json({
      code: 200,
      message: '玩家已被强制离开游戏',
      data: null
    });

  } catch (error) {
    console.error('强制离开游戏失败:', error);
    return serverError(res, '强制离开游戏失败');
  }
};


