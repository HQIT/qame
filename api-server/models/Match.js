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
      minPlayers
    } = data;

    const result = await query(`
      INSERT INTO matches (id, game_id, creator_id, max_players, min_players)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, gameId, creatorId, maxPlayers, minPlayers]);

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
      whereClause += ` AND m.game_id = $${paramIndex}`;
      params.push(filters.gameId);
      paramIndex++;
    }

    if (filters.status) {
      whereClause += ` AND m.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.creatorId) {
      whereClause += ` AND m.creator_id = $${paramIndex}`;
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
        u.username as user_name
      FROM match_players mp
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.match_id = $1
      ORDER BY mp.seat_index
    `, [matchId]);

    match.players = playersResult.rows;
    return match;
  }

  // 更新match状态
  static async updateStatus(matchId, status) {
    const result = await query(`
      UPDATE matches 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, matchId]);

    if (result.rows.length === 0) {
      throw new Error('Match not found');
    }

    return new Match(result.rows[0]);
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
      'SELECT COUNT(*) as count FROM match_players WHERE match_id = $1',
      [matchId]
    );
    return parseInt(result.rows[0].count);
  }

  // 检查match是否可以开始
  static async canStart(matchId) {
    const match = await this.findById(matchId);
    if (!match || match.status !== 'waiting') {
      return { canStart: false, reason: 'Match不存在或状态不正确' };
    }

    // 检查boardgame.io match ID是否存在
    if (!match.bgio_match_id) {
      return { canStart: false, reason: 'boardgame.io match ID不存在' };
    }

    const playerCount = await this.getPlayerCount(matchId);
    if (playerCount < match.min_players || playerCount > match.max_players) {
      return { canStart: false, reason: `玩家数量不符合要求 (当前${playerCount}人，需要${match.min_players}-${match.max_players}人)` };
    }

    return { canStart: true, reason: null };
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

      ORDER BY m.updated_at DESC
    `, [userId]);

    return result.rows.map(row => new Match(row));
  }

  // 更新match的bgio_match_id
  static async updateBgioMatchId(matchId, bgioMatchId) {
    const result = await query('UPDATE matches SET bgio_match_id = $1 WHERE id = $2 RETURNING *', [bgioMatchId, matchId]);
    return result.rows.length > 0 ? new Match(result.rows[0]) : null;
  }

  // 获取match的AI玩家信息
  static async getAIPlayers(matchId) {
    const result = await query(`
      SELECT mp.*
      FROM match_players mp
      WHERE mp.match_id = $1 
        AND mp.player_type = 'ai' 
        AND mp.status = 'joined'
      ORDER BY mp.seat_index
    `, [matchId]);
    return result.rows.map(r => ({ ...r, endpoint: null, config_schema: null, ai_type_name: null }));
  }

  // 获取match的第一个玩家
  static async getFirstPlayer(matchId) {
    const result = await query(
      'SELECT seat_index, player_name, player_type FROM match_players WHERE match_id = $1 ORDER BY seat_index LIMIT 1',
      [matchId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 根据match ID查找bgio_match_id
  static async findBgioMatchIdByMatchId(matchId) {
    const result = await query('SELECT bgio_match_id FROM matches WHERE id = $1', [matchId]);
    return result.rows.length > 0 ? result.rows[0].bgio_match_id : null;
  }

  // 预设AI类型已移除
}

module.exports = Match;