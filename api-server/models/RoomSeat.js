const { query } = require('../config/database');

class RoomSeat {
  // 加入座位（人类玩家）
  static async joinSeat(roomId, seatNumber, userId) {
    try {
      // 检查座位是否可用
      const seat = await this.findByRoomAndSeat(roomId, seatNumber);
      if (!seat || seat.status !== 'empty') {
        throw new Error('座位不可用');
      }

      // 检查用户是否已在其他座位
      const existingSeat = await query(
        'SELECT id FROM room_seats WHERE room_id = $1 AND user_id = $2',
        [roomId, userId]
      );
      
      if (existingSeat.rows.length > 0) {
        throw new Error('您已在此房间中');
      }

      const result = await query(
        'UPDATE room_seats SET user_id = $1, status = $2 WHERE room_id = $3 AND seat_number = $4 RETURNING *',
        [userId, 'human', roomId, seatNumber]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('加入座位失败:', error);
      throw error;
    }
  }

  // 设置AI座位
  static async setAISeat(roomId, seatNumber, aiTypeId) {
    try {
      // 检查座位是否可用
      const seat = await this.findByRoomAndSeat(roomId, seatNumber);
      if (!seat || seat.status !== 'empty') {
        throw new Error('座位不可用');
      }

      const result = await query(
        'UPDATE room_seats SET ai_type_id = $1, status = $2 WHERE room_id = $3 AND seat_number = $4 RETURNING *',
        [aiTypeId, 'ai', roomId, seatNumber]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('设置AI座位失败:', error);
      throw error;
    }
  }

  // 离开座位
  static async leaveSeat(roomId, seatNumber, userId) {
    try {
      // 检查是否是自己的座位
      const seat = await this.findByRoomAndSeat(roomId, seatNumber);
      if (!seat || seat.user_id !== userId) {
        throw new Error('只能离开自己的座位');
      }

      const result = await query(
        'UPDATE room_seats SET user_id = NULL, status = $1 WHERE room_id = $2 AND seat_number = $3 RETURNING *',
        ['empty', roomId, seatNumber]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('离开座位失败:', error);
      throw error;
    }
  }

  // 移除AI座位
  static async removeAISeat(roomId, seatNumber) {
    try {
      const result = await query(
        'UPDATE room_seats SET ai_type_id = NULL, status = $1 WHERE room_id = $2 AND seat_number = $3 RETURNING *',
        ['empty', roomId, seatNumber]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('移除AI座位失败:', error);
      throw error;
    }
  }

  // 根据房间和座位号查找座位
  static async findByRoomAndSeat(roomId, seatNumber) {
    try {
      const result = await query(
        'SELECT * FROM room_seats WHERE room_id = $1 AND seat_number = $2',
        [roomId, seatNumber]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找座位失败:', error);
      throw error;
    }
  }

  // 获取房间的所有座位
  static async findByRoomId(roomId) {
    try {
      const result = await query(`
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
      `, [roomId]);
      return result.rows;
    } catch (error) {
      console.error('获取房间座位失败:', error);
      throw error;
    }
  }

  // 检查房间是否已满
  static async isRoomFull(roomId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_seats,
          COUNT(CASE WHEN status IN ('human', 'ai') THEN 1 END) as occupied_seats
        FROM room_seats 
        WHERE room_id = $1
      `, [roomId]);
      
      const { total_seats, occupied_seats } = result.rows[0];
      return parseInt(occupied_seats) >= parseInt(total_seats);
    } catch (error) {
      console.error('检查房间是否已满失败:', error);
      throw error;
    }
  }

  // 检查房间是否准备就绪（所有座位都有玩家或AI）
  static async isRoomReady(roomId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_seats,
          COUNT(CASE WHEN status IN ('human', 'ai') THEN 1 END) as occupied_seats
        FROM room_seats 
        WHERE room_id = $1
      `, [roomId]);
      
      const { total_seats, occupied_seats } = result.rows[0];
      return parseInt(occupied_seats) === parseInt(total_seats);
    } catch (error) {
      console.error('检查房间是否准备就绪失败:', error);
      throw error;
    }
  }

  // 获取用户在房间中的座位
  static async getUserSeat(roomId, userId) {
    try {
      const result = await query(
        'SELECT * FROM room_seats WHERE room_id = $1 AND user_id = $2',
        [roomId, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('获取用户座位失败:', error);
      throw error;
    }
  }
}

module.exports = RoomSeat; 