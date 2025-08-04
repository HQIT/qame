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

  // 获取用户在match中的玩家信息
  static async findByUserAndMatch(userId, matchId) {
    const result = await query(`
      SELECT * FROM match_players 
      WHERE user_id = $1 AND match_id = $2 AND status != 'left'
    `, [userId, matchId]);

    return result.rows.length > 0 ? new MatchPlayer(result.rows[0]) : null;
  }

  // 检查用户是否已在match中
  static async isUserInMatch(userId, matchId) {
    const result = await query(`
      SELECT 1 FROM match_players 
      WHERE user_id = $1 AND match_id = $2 AND status != 'left'
    `, [userId, matchId]);

    return result.rows.length > 0;
  }

  // 获取match中的下一个可用座位
  static async getNextAvailableSeat(matchId) {
    // 获取match的最大玩家数
    const matchResult = await query('SELECT max_players FROM matches WHERE id = $1', [matchId]);
    if (matchResult.rows.length === 0) {
      throw new Error('Match not found');
    }

    const maxPlayers = matchResult.rows[0].max_players;

    // 找到第一个可用的座位
    for (let seatIndex = 0; seatIndex < maxPlayers; seatIndex++) {
      const isAvailable = await this.isSeatAvailable(matchId, seatIndex);
      if (isAvailable) {
        return seatIndex;
      }
    }

    return -1; // 没有可用座位
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