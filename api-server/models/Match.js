const { query } = require('../config/database');

class Match {
  constructor(data) {
    Object.assign(this, data);
  }

  // 创建新的match
  static async create(data) {
    const { 
      id, 
      gameId, 
      creatorId, 
      maxPlayers, 
      minPlayers, 
      allowSpectators = false, 
      isPrivate = false, 
      autoStart = false, 
      gameConfig = {} 
    } = data;

    const result = await query(`
      INSERT INTO matches (id, game_id, creator_id, max_players, min_players, allow_spectators, is_private, auto_start, game_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, gameId, creatorId, maxPlayers, minPlayers, allowSpectators, isPrivate, autoStart, JSON.stringify(gameConfig)]);

    return new Match(result.rows[0]);
  }

  // 根据ID获取match
  static async findById(matchId) {
    const result = await query('SELECT * FROM matches WHERE id = $1', [matchId]);
    return result.rows.length > 0 ? new Match(result.rows[0]) : null;
  }

  // 获取match列表
  static async findAll(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.gameId) {
      whereClause += ` AND game_id = $${paramIndex}`;
      params.push(filters.gameId);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.creatorId) {
      whereClause += ` AND creator_id = $${paramIndex}`;
      params.push(filters.creatorId);
      paramIndex++;
    }

    const result = await query(`
      SELECT m.*, g.name as game_name, u.username as creator_name
      FROM matches m
      JOIN games g ON m.game_id = g.id
      JOIN users u ON m.creator_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
    `, params);

    return result.rows.map(row => new Match(row));
  }

  // 获取match及其玩家信息
  static async findByIdWithPlayers(matchId) {
    const matchResult = await query(`
      SELECT m.*, g.name as game_name, u.username as creator_name
      FROM matches m
      JOIN games g ON m.game_id = g.id
      JOIN users u ON m.creator_id = u.id
      WHERE m.id = $1
    `, [matchId]);

    if (matchResult.rows.length === 0) {
      return null;
    }

    const match = new Match(matchResult.rows[0]);

    // 获取玩家信息
    const playersResult = await query(`
      SELECT 
        mp.*,
        u.username as user_name,
        at.name as ai_type_name,
        ap.name as ai_provider_name
      FROM match_players mp
      LEFT JOIN users u ON mp.user_id = u.id
      LEFT JOIN ai_types at ON mp.ai_type_id = at.id
      LEFT JOIN ai_providers ap ON at.provider_id = ap.id
      WHERE mp.match_id = $1
      ORDER BY mp.seat_index
    `, [matchId]);

    match.players = playersResult.rows;
    return match;
  }

  // 更新match状态
  static async updateStatus(matchId, status, changedBy = null, notes = null) {
    await query('BEGIN');
    
    try {
      // 更新match状态
      const result = await query(`
        UPDATE matches 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [status, matchId]);

      if (result.rows.length === 0) {
        throw new Error('Match not found');
      }

      // 记录状态变化历史
      await query(`
        INSERT INTO match_status_history (match_id, status, changed_by, notes)
        VALUES ($1, $2, $3, $4)
      `, [matchId, status, changedBy, notes]);

      await query('COMMIT');
      return new Match(result.rows[0]);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  // 删除match
  static async delete(matchId) {
    const result = await query('DELETE FROM matches WHERE id = $1 RETURNING *', [matchId]);
    return result.rows.length > 0;
  }

  // 检查用户是否是match的创建者
  static async isCreator(matchId, userId) {
    const result = await query(
      'SELECT 1 FROM matches WHERE id = $1 AND creator_id = $2',
      [matchId, userId]
    );
    return result.rows.length > 0;
  }

  // 获取match的玩家数量
  static async getPlayerCount(matchId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM match_players WHERE match_id = $1 AND status != $2',
      [matchId, 'left']
    );
    return parseInt(result.rows[0].count);
  }

  // 检查match是否可以开始
  static async canStart(matchId) {
    const match = await this.findById(matchId);
    if (!match || match.status !== 'waiting') {
      return false;
    }

    const playerCount = await this.getPlayerCount(matchId);
    return playerCount >= match.min_players && playerCount <= match.max_players;
  }

  // 获取用户的活跃matches
  static async findActiveByUser(userId) {
    const result = await query(`
      SELECT DISTINCT m.*, g.name as game_name
      FROM matches m
      JOIN games g ON m.game_id = g.id
      JOIN match_players mp ON m.id = mp.match_id
      WHERE (m.creator_id = $1 OR mp.user_id = $1)
        AND m.status IN ('waiting', 'ready', 'playing')
        AND mp.status != 'left'
      ORDER BY m.updated_at DESC
    `, [userId]);

    return result.rows.map(row => new Match(row));
  }
}

module.exports = Match;