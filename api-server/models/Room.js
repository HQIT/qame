const { query } = require('../config/database');

class Room {
  // 创建新房间
  static async create(gameId, name, maxPlayers, createdBy) {
    try {
      const result = await query(
        'INSERT INTO rooms (game_id, name, max_players, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [gameId, name, maxPlayers, createdBy]
      );
      
      // 创建默认座位
      const room = result.rows[0];
      await this.createDefaultSeats(room.id, maxPlayers);
      
      return room;
    } catch (error) {
      console.error('创建房间失败:', error);
      throw error;
    }
  }

  // 创建默认座位
  static async createDefaultSeats(roomId, maxPlayers) {
    try {
      for (let i = 0; i < maxPlayers; i++) {
        await query(
          'INSERT INTO room_seats (room_id, seat_number) VALUES ($1, $2)',
          [roomId, i]
        );
      }
    } catch (error) {
      console.error('创建默认座位失败:', error);
      throw error;
    }
  }

  // 获取所有房间
  static async findAll() {
    try {
      const result = await query(`
        SELECT 
          r.*,
          g.name as game_name,
          u.username as creator_name,
          COUNT(rs.id) as current_players,
          COUNT(CASE WHEN rs.status = 'human' THEN 1 END) as human_players,
          COUNT(CASE WHEN rs.status = 'ai' THEN 1 END) as ai_players
        FROM rooms r
        LEFT JOIN games g ON r.game_id = g.id
        LEFT JOIN users u ON r.created_by = u.id
        LEFT JOIN room_seats rs ON r.id = rs.room_id
        GROUP BY r.id, g.name, u.username
        ORDER BY r.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  }

  // 根据ID获取房间详情
  static async findById(id) {
    try {
      const result = await query(`
        SELECT 
          r.*,
          g.name as game_name,
          u.username as creator_name
        FROM rooms r
        LEFT JOIN games g ON r.game_id = g.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const room = result.rows[0];
      
      // 获取座位信息
      const seatsResult = await query(`
        SELECT 
          rs.*,
          u.username as user_name,
          at.name as ai_type_name,
          ap.name as ai_provider_name
        FROM room_seats rs
        LEFT JOIN users u ON rs.user_id = u.id
        LEFT JOIN ai_types at ON rs.ai_type_id = at.id
        LEFT JOIN ai_providers ap ON at.provider_id = ap.id
        WHERE rs.room_id = $1
        ORDER BY rs.seat_number
      `, [id]);
      
      room.seats = seatsResult.rows;
      return room;
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw error;
    }
  }

  // 更新房间状态
  static async updateStatus(id, status) {
    try {
      const result = await query(
        'UPDATE rooms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('更新房间状态失败:', error);
      throw error;
    }
  }

  // 删除房间
  static async delete(id) {
    try {
      const result = await query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('删除房间失败:', error);
      throw error;
    }
  }

  // 获取房间统计
  static async getStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
          COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
          COUNT(CASE WHEN status = 'playing' THEN 1 END) as playing,
          COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished
        FROM rooms
      `);
      return result.rows[0];
    } catch (error) {
      console.error('获取房间统计失败:', error);
      throw error;
    }
  }
}

module.exports = Room; 