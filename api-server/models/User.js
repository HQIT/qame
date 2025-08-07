const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/database');

class User {
  // 创建新用户
  static async create(username, password, role = 'user') {
    try {
      // 检查用户名是否已存在
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('用户名已存在');
      }

      // 使用统一的salt进行密码哈希
      const UNIFIED_SALT = process.env.PASSWORD_SALT || 'your_fixed_salt_here';
      const passwordHash = crypto.createHash('sha256').update(password + UNIFIED_SALT).digest('hex');
      
      // 插入新用户
      const result = await query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
        [username, passwordHash, role]
      );

      return result.rows[0];
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  // 根据用户名查找用户
  static async findByUsername(username) {
    try {
      const result = await query(
        'SELECT id, username, password_hash, role, created_at FROM users WHERE username = $1',
        [username]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 根据ID查找用户
  static async findById(id) {
    try {
      const result = await query(
        'SELECT id, username, password_hash, role, created_at FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 查找Admin用户
  static async findAdmin() {
    try {
      const result = await query(
        'SELECT id, username, role, created_at FROM users WHERE role = $1 LIMIT 1',
        ['admin']
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找Admin用户失败:', error);
      throw error;
    }
  }

  // 获取所有用户（分页）
  static async findAll(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const result = await query(
        'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  // 验证用户密码（使用统一salt）
  static async verifyPassword(password, passwordHash) {
    try {
      const UNIFIED_SALT = process.env.PASSWORD_SALT || 'your_fixed_salt_here';
      const expectedHash = crypto.createHash('sha256').update(password + UNIFIED_SALT).digest('hex');
      return expectedHash === passwordHash;
    } catch (error) {
      console.error('密码验证失败:', error);
      return false;
    }
  }

  // 用户登录
  static async login(username, password) {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        throw new Error('用户名或密码错误');
      }

      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('用户名或密码错误');
      }

      // 返回用户信息（不包含密码）
      const { password_hash, ...userInfo } = user;
      return userInfo;
    } catch (error) {
      console.error('用户登录失败:', error);
      throw error;
    }
  }

  // 更新用户信息
  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'password_hash') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, role, created_at, updated_at`,
        values
      );

      return result.rows[0];
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  // 删除用户
  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  // 创建Admin用户
  static async createAdmin(username, password) {
    try {
      // 检查用户名是否已存在
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('用户名已存在');
      }

      // 使用统一的salt进行密码哈希
      const UNIFIED_SALT = process.env.PASSWORD_SALT || 'your_fixed_salt_here';
      const passwordHash = crypto.createHash('sha256').update(password + UNIFIED_SALT).digest('hex');

      // 插入Admin用户
      const result = await query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
        [username, passwordHash, 'admin']
      );

      return result.rows[0];
    } catch (error) {
      console.error('创建Admin用户失败:', error);
      throw error;
    }
  }

  // 获取用户统计信息
  static async getStats() {
    try {
      // 用户统计
      const userResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count
        FROM users
      `);

      // 比赛统计
      const matchResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
          COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
          COUNT(CASE WHEN status = 'playing' THEN 1 END) as playing,
          COUNT(CASE WHEN status = 'finished' THEN 1 END) as finished,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
        FROM matches
      `);

      // 在线用户统计
      let onlineResult;
      try {
        onlineResult = await query(`
          SELECT 
            COUNT(DISTINCT u.id) as total,
            COUNT(DISTINCT CASE WHEN u.player_type = 'human' THEN u.id END) as human,
            COUNT(DISTINCT CASE WHEN u.player_type = 'ai' THEN u.id END) as ai
          FROM (
            SELECT id::text, 'human' as player_type FROM user_online_status 
            WHERE last_heartbeat > NOW() - INTERVAL '2 minutes'
            UNION ALL
            SELECT id::text, 'ai' as player_type FROM ai_clients 
            WHERE status = 'connected'
          ) u
        `);
      } catch (onlineError) {
        console.warn('AI clients table may not exist, falling back to human users only:', onlineError.message);
        // 如果ai_clients表不存在，只查询人类用户
        onlineResult = await query(`
          SELECT 
            COUNT(*) as total,
            COUNT(*) as human,
            0 as ai
          FROM user_online_status 
          WHERE last_heartbeat > NOW() - INTERVAL '2 minutes'
        `);
      }
      
      return {
        users: {
          total: parseInt(userResult.rows[0].total),
          admin_count: parseInt(userResult.rows[0].admin_count),
          user_count: parseInt(userResult.rows[0].user_count)
        },
        matches: {
          total: parseInt(matchResult.rows[0].total),
          waiting: parseInt(matchResult.rows[0].waiting),
          ready: parseInt(matchResult.rows[0].ready),
          playing: parseInt(matchResult.rows[0].playing),
          finished: parseInt(matchResult.rows[0].finished),
          cancelled: parseInt(matchResult.rows[0].cancelled)
        },
        online: {
          total: parseInt(onlineResult.rows[0].total || 0),
          human: parseInt(onlineResult.rows[0].human || 0),
          ai: parseInt(onlineResult.rows[0].ai || 0)
        }
      };
    } catch (error) {
      console.error('获取统计失败:', error);
      throw error;
    }
  }
}

module.exports = User; 