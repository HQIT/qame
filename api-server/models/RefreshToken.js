const { query } = require('../config/database');

class RefreshToken {
  // 创建Refresh Token
  static async create(userId, token, expiresAt) {
    try {
      const result = await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, token, expires_at',
        [userId, token, expiresAt]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('创建Refresh Token失败:', error);
      throw error;
    }
  }

  // 根据token查找Refresh Token
  static async findByToken(token) {
    try {
      const result = await query(
        'SELECT id, user_id, token, expires_at FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [token]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找Refresh Token失败:', error);
      throw error;
    }
  }

  // 删除用户的Refresh Token
  static async deleteByUserId(userId) {
    try {
      const result = await query(
        'DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING id',
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('删除Refresh Token失败:', error);
      throw error;
    }
  }

  // 删除指定的Refresh Token
  static async deleteByToken(token) {
    try {
      const result = await query(
        'DELETE FROM refresh_tokens WHERE token = $1 RETURNING id',
        [token]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('删除Refresh Token失败:', error);
      throw error;
    }
  }

  // 清理过期的Refresh Token
  static async cleanupExpired() {
    try {
      const result = await query(
        'DELETE FROM refresh_tokens WHERE expires_at <= NOW() RETURNING id'
      );
      
      return result.rows.length;
    } catch (error) {
      console.error('清理过期Refresh Token失败:', error);
      throw error;
    }
  }
}

module.exports = RefreshToken; 