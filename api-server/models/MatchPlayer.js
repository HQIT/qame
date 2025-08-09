const { query } = require('../config/database');

class MatchPlayer {
  constructor(data) {
    Object.assign(this, data);
  }

  // 添加玩家到match
  static async addPlayer(data) {
    const { 
      matchId, 
      seatIndex, 
      playerType, 
      userId = null, 
      playerName, 
      aiPlayerId = null
    } = data;

    // 防止重复加入同一座位
    const existingPlayer = await query(`
      SELECT * FROM match_players
      WHERE match_id = $1 AND seat_index = $2 AND status != 'left'
    `, [matchId, seatIndex]);

    if (existingPlayer.rows.length > 0) {
      throw new Error('Seat already taken');
    }

    // 验证数据
    if (playerType === 'human' && !userId) {
      throw new Error('Human player must have userId');
    }
    if (playerType === 'ai' && !aiPlayerId) {
      throw new Error('AI player must have aiPlayerId');
    }

    // 获取或创建unified player记录
    let playerId;
    if (playerType === 'human') {
      // 查找现有的human player记录
      const playerResult = await query(`
        SELECT id FROM players WHERE user_id = $1 AND player_type = 'human'
      `, [userId]);
      
      if (playerResult.rows.length > 0) {
        playerId = playerResult.rows[0].id;
      } else {
        // 创建新的human player记录
        const newPlayerResult = await query(`
          INSERT INTO players (player_name, player_type, user_id, status)
          VALUES ($1, 'human', $2, 'active')
          RETURNING id
        `, [playerName, userId]);
        playerId = newPlayerResult.rows[0].id;
      }
    } else if (playerType === 'ai') {
      // 查找现有的AI player记录
      const playerResult = await query(`
        SELECT id FROM players WHERE ai_player_id = $1 AND player_type = 'ai'
      `, [aiPlayerId]);
      
      if (playerResult.rows.length > 0) {
        playerId = playerResult.rows[0].id;
      } else {
        // 创建新的AI player记录
        const newPlayerResult = await query(`
          INSERT INTO players (player_name, player_type, ai_player_id, status)
          VALUES ($1, 'ai', $2, 'active')
          RETURNING id
        `, [playerName, aiPlayerId]);
        playerId = newPlayerResult.rows[0].id;
      }
    }

    // 插入match_players记录（兼容新旧字段结构）
    const result = await query(`
      INSERT INTO match_players (match_id, seat_index, player_type, player_id, player_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [matchId, seatIndex, playerType, playerId, playerName]);

    return new MatchPlayer(result.rows[0]);
  }

  // 获取match的所有玩家
  static async findByMatchId(matchId) {
    const result = await query(`
      SELECT 
        mp.*,
        u.username as user_name
      FROM match_players mp
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.match_id = $1
      ORDER BY mp.seat_index
    `, [matchId]);

    return result.rows.map(row => new MatchPlayer(row));
  }

  // 根据ID获取玩家
  static async findById(playerId) {
    const result = await query(`
      SELECT 
        mp.*,
        u.username as user_name
      FROM match_players mp
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.id = $1
    `, [playerId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 移除玩家
  static async removePlayer(matchId, playerId) {
    const result = await query(`
      DELETE FROM match_players 
      WHERE match_id = $1 AND id = $2
      RETURNING *
    `, [matchId, playerId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 通过座位索引移除玩家
  static async removePlayerBySeat(matchId, seatIndex) {
    const result = await query(`
      DELETE FROM match_players 
      WHERE match_id = $1 AND seat_index = $2
      RETURNING *
    `, [matchId, seatIndex]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 检查座位是否可用
  static async isSeatAvailable(matchId, seatIndex) {
    // 读取match最大席位，防止越界
    const matchRes = await query('SELECT max_players FROM matches WHERE id = $1', [matchId]);
    const maxPlayers = matchRes.rows.length ? parseInt(matchRes.rows[0].max_players) : 0;
    if (seatIndex < 0 || seatIndex >= maxPlayers) return false;

    const result = await query(
      'SELECT 1 FROM match_players WHERE match_id = $1 AND seat_index = $2',
      [matchId, seatIndex]
    );
    return result.rows.length === 0;
  }

  // 获取用户在match中的玩家信息（包括已离开的玩家，按加入时间倒序）
  static async findByUserAndMatch(userId, matchId) {
    const result = await query(`
      SELECT * FROM match_players 
      WHERE user_id = $1 AND match_id = $2
      ORDER BY joined_at DESC
      LIMIT 1
    `, [userId, matchId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 检查用户是否在match中
  static async isUserInMatch(userId, matchId) {
    const result = await query(
      'SELECT 1 FROM match_players WHERE user_id = $1 AND match_id = $2',
      [userId, matchId]
    );
    return result.rows.length > 0;
  }

  // 获取下一个可用座位
  static async getNextAvailableSeat(matchId) {
    // 获取最大玩家数
    const matchRes = await query('SELECT max_players FROM matches WHERE id = $1', [matchId]);
    if (!matchRes.rows.length) return -1;
    const maxPlayers = parseInt(matchRes.rows[0].max_players);

    // 查询当前占用的座位
    const occRes = await query(
      'SELECT seat_index FROM match_players WHERE match_id = $1 ORDER BY seat_index',
      [matchId]
    );
    const occupied = new Set(occRes.rows.map(r => parseInt(r.seat_index)));

    // 返回第一个空位 [0, maxPlayers-1]
    for (let i = 0; i < maxPlayers; i++) {
      if (!occupied.has(i)) return i;
    }
    return -1;
  }

  // 检查AI类型是否存在
  static async checkAITypeExists(aiTypeId) {
    const result = await query('SELECT * FROM ai_types WHERE id = $1 AND status = $2', [aiTypeId, 'active']);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 检查AI玩家是否已存在
  static async checkAIExists(matchId, aiTypeId) {
    const result = await query(`
      SELECT * FROM match_players 
      WHERE match_id = $1 AND ai_type_id = $2
    `, [matchId, aiTypeId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 获取用户在match中的凭证
  static async getCredentialsByUser(matchId, userId) {
    const result = await query(
      'SELECT player_credentials, seat_index FROM match_players WHERE match_id = $1 AND user_id = $2',
      [matchId, userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 通过bgio_match_id获取用户凭证
  static async getCredentialsByBgioMatchId(bgioMatchId, userId) {
    const result = await query(`
      SELECT mp.player_credentials, mp.seat_index 
      FROM match_players mp 
      JOIN matches m ON mp.match_id = m.id 
      WHERE m.bgio_match_id = $1 AND mp.user_id = $2
    `, [bgioMatchId, userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 根据用户ID和match ID查找玩家
  static async findByUserIdAndMatchId(userId, matchId) {
    const result = await query(
      'SELECT player_credentials, seat_index FROM match_players WHERE match_id = $1 AND user_id = $2',
      [matchId, userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 通过bgio_match_id和用户ID查找玩家
  static async findByBgioMatchIdAndUserId(bgioMatchId, userId) {
    const result = await query(`
      SELECT mp.player_credentials, mp.seat_index 
      FROM match_players mp 
      JOIN matches m ON mp.match_id = m.id 
      WHERE m.bgio_match_id = $1 AND mp.user_id = $2
    `, [bgioMatchId, userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 查找用户的活跃matches
  static async findActiveMatchesByUserId(userId) {
    const result = await query(`
      SELECT m.id as match_id, m.game_id, mp.seat_index
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.id
      WHERE mp.user_id = $1 
      AND mp.status = 'joined' 
      AND m.status IN ('waiting', 'playing')
    `, [userId]);
    return result.rows;
  }

  // 查找已存在的AI玩家
  // findExistingAIPlayer方法已删除，不再需要处理left状态

  // 更新玩家凭证
  static async updatePlayerCredentials(matchId, userId, playerCredentials) {
    // 只更新该match中该用户最新一条非left记录的凭证
    const result = await query(`
      UPDATE match_players SET player_credentials = $1
      WHERE id = (
        SELECT id FROM match_players 
        WHERE match_id = $2 AND user_id = $3
        ORDER BY joined_at DESC
        LIMIT 1
      )
      RETURNING *
    `, [playerCredentials, matchId, userId]);
    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 按玩家记录ID更新凭证（用于AI或无userId的场景）
  static async updatePlayerCredentialsByPlayerId(playerId, playerCredentials) {
    const result = await query(
      'UPDATE match_players SET player_credentials = $1 WHERE id = $2 RETURNING *',
      [playerCredentials, playerId]
    );
    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 查找match的第一个玩家
  static async findFirstPlayerByMatchId(matchId) {
    const result = await query(
      'SELECT seat_index, player_name, player_type FROM match_players WHERE match_id = $1 ORDER BY seat_index LIMIT 1',
      [matchId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 更新玩家状态
  static async updateStatus(playerId, status) {
    const result = await query(`
      UPDATE match_players 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, playerId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 获取玩家的显示信息（用于前端显示）
  getDisplayInfo() {
    return {
      id: this.id,
      seatIndex: this.seat_index,
      playerType: this.player_type,
      playerName: this.player_name,
      status: this.status,
      isAI: this.player_type === 'ai',
      aiTypeName: this.ai_type_name,
      aiProviderName: this.ai_provider_name,
      userName: this.user_name,
      userId: this.user_id,
      joinedAt: this.joined_at
    };
  }

  // 检查玩家是否可以被移除
  canBeRemoved(requestUserId, isCreator) {
    // AI玩家：创建者可以移除
    if (this.player_type === 'ai') {
      return isCreator;
    }

    // 人类玩家：只能自己移除自己
    if (this.player_type === 'human') {
      return this.user_id === requestUserId;
    }

    return false;
  }
}

module.exports = MatchPlayer;