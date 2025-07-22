const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class User {
  // 创建新用户
  static async create(username, password) {
    try {
      // 检查用户名是否已存在
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('用户名已存在');
      }

      // 加密密码
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 插入新用户
      const result = await query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
        [username, passwordHash]
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
        'SELECT id, username, password_hash, created_at FROM users WHERE username = $1',
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
        'SELECT id, username, created_at FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 验证用户密码
  static async verifyPassword(password, passwordHash) {
    try {
      return await bcrypt.compare(password, passwordHash);
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
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, created_at, updated_at`,
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

  // 获取所有用户（分页）
  static async findAll(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const result = await query(
        'SELECT id, username, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }
}

module.exports = User; 