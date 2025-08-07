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
      aiTypeId = null, 
      playerName, 
      aiConfig = {} 
    } = data;

    // 验证数据
    if (playerType === 'human' && !userId) {
      throw new Error('Human player must have userId');
    }
    if (playerType === 'ai' && !aiTypeId) {
      throw new Error('AI player must have aiTypeId');
    }

    // 检查是否有已离开的玩家占用此座位，如果有则重用该记录
    const existingLeftPlayer = await query(`
      SELECT * FROM match_players 
      WHERE match_id = $1 AND seat_index = $2 AND status = 'left'
      ORDER BY left_at DESC 
      LIMIT 1
    `, [matchId, seatIndex]);

    if (existingLeftPlayer.rows.length > 0) {
      // 重用已离开玩家的记录
      const result = await query(`
        UPDATE match_players 
        SET player_type = $1, user_id = $2, ai_type_id = $3, player_name = $4, 
            ai_config = $5, status = 'joined', joined_at = CURRENT_TIMESTAMP, left_at = NULL
        WHERE id = $6
        RETURNING *
      `, [playerType, userId, aiTypeId, playerName, JSON.stringify(aiConfig), existingLeftPlayer.rows[0].id]);
      
      return new MatchPlayer(result.rows[0]);
    } else {
      // 创建新记录
      const result = await query(`
        INSERT INTO match_players (match_id, seat_index, player_type, user_id, ai_type_id, player_name, ai_config)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [matchId, seatIndex, playerType, userId, aiTypeId, playerName, JSON.stringify(aiConfig)]);

      return new MatchPlayer(result.rows[0]);
    }
  }

  // 获取match的所有玩家
  static async findByMatchId(matchId) {
    const result = await query(`
      SELECT 
        mp.*,
        u.username as user_name,
        at.name as ai_type_name,
        ap.name as ai_provider_name
      FROM match_players mp
      LEFT JOIN users u ON mp.user_id = u.id
      LEFT JOIN ai_types at ON mp.ai_type_id = at.id
      LEFT JOIN ai_providers ap ON at.provider_id = ap.id
      WHERE mp.match_id = $1 AND mp.status != 'left'
      ORDER BY mp.seat_index
    `, [matchId]);

    return result.rows.map(row => new MatchPlayer(row));
  }

  // 根据ID获取玩家
  static async findById(playerId) {
    const result = await query(`
      SELECT 
        mp.*,
        u.username as user_name,
        at.name as ai_type_name,
        ap.name as ai_provider_name
      FROM match_players mp
      LEFT JOIN users u ON mp.user_id = u.id
      LEFT JOIN ai_types at ON mp.ai_type_id = at.id
      LEFT JOIN ai_providers ap ON at.provider_id = ap.id
      WHERE mp.id = $1
    `, [playerId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 移除玩家
  static async removePlayer(matchId, playerId) {
    const result = await query(`
      UPDATE match_players 
      SET status = 'left', left_at = CURRENT_TIMESTAMP
      WHERE match_id = $1 AND id = $2
      RETURNING *
    `, [matchId, playerId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 通过座位索引移除玩家
  static async removePlayerBySeat(matchId, seatIndex) {
    const result = await query(`
      UPDATE match_players 
      SET status = 'left', left_at = CURRENT_TIMESTAMP
      WHERE match_id = $1 AND seat_index = $2 AND status != 'left'
      RETURNING *
    `, [matchId, seatIndex]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 检查座位是否可用
  static async isSeatAvailable(matchId, seatIndex) {
    const result = await query(`
      SELECT 1 FROM match_players 
      WHERE match_id = $1 AND seat_index = $2 AND status != 'left'
    `, [matchId, seatIndex]);

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
      'SELECT 1 FROM match_players WHERE user_id = $1 AND match_id = $2 AND status != $3',
      [userId, matchId, 'left']
    );
    return result.rows.length > 0;
  }

  // 获取下一个可用座位
  static async getNextAvailableSeat(matchId) {
    const result = await query(`
      SELECT COALESCE(MAX(seat_index), -1) + 1 as next_seat
      FROM match_players 
      WHERE match_id = $1 AND status != 'left'
    `, [matchId]);
    return parseInt(result.rows[0].next_seat);
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
      WHERE match_id = $1 AND ai_type_id = $2 AND status != 'left'
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
  static async findExistingAIPlayer(matchId, aiTypeId) {
    const result = await query(`
      SELECT * FROM match_players 
      WHERE match_id = $1 AND ai_type_id = $2 AND status = 'left'
      ORDER BY left_at DESC 
      LIMIT 1
    `, [matchId, aiTypeId]);
    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 更新玩家凭证
  static async updatePlayerCredentials(matchId, userId, playerCredentials) {
    const result = await query(
      'UPDATE match_players SET player_credentials = $1 WHERE match_id = $2 AND user_id = $3 RETURNING *',
      [playerCredentials, matchId, userId]
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