const { query } = require('../config/database');

class AIClientModel {
  // 创建AI客户端记录
  static async create(clientData) {
    try {
      const {
        id,
        player_name,
        game_type,
        status = 'created',
        match_id = null,
        player_id = null,
        ai_config = {}
      } = clientData;

      const result = await query(`
        INSERT INTO ai_clients (
          id, player_name, game_type, status, match_id, player_id, ai_config, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [id, player_name, game_type, status, match_id, player_id, JSON.stringify(ai_config)]);

      return result.rows[0];
    } catch (error) {
      console.error('创建AI客户端记录失败:', error);
      throw error;
    }
  }

  // 更新AI客户端状态
  static async updateStatus(clientId, status, additionalData = {}) {
    try {
      const setClause = ['status = $2', 'updated_at = NOW()'];
      const values = [clientId, status];
      let paramIndex = 3;

      // 动态添加其他字段
      if (additionalData.match_id !== undefined) {
        setClause.push(`match_id = $${paramIndex}`);
        values.push(additionalData.match_id);
        paramIndex++;
      }

      if (additionalData.player_id !== undefined) {
        setClause.push(`player_id = $${paramIndex}`);
        values.push(additionalData.player_id);
        paramIndex++;
      }

      if (additionalData.last_seen !== undefined) {
        setClause.push(`last_seen = $${paramIndex}`);
        values.push(additionalData.last_seen);
        paramIndex++;
      }

      const result = await query(`
        UPDATE ai_clients 
        SET ${setClause.join(', ')}
        WHERE id = $1
        RETURNING *
      `, values);

      return result.rows[0];
    } catch (error) {
      console.error('更新AI客户端状态失败:', error);
      throw error;
    }
  }

  // 删除AI客户端记录
  static async delete(clientId) {
    try {
      const result = await query(`
        DELETE FROM ai_clients WHERE id = $1 RETURNING *
      `, [clientId]);

      return result.rows[0];
    } catch (error) {
      console.error('删除AI客户端记录失败:', error);
      throw error;
    }
  }

  // 获取所有AI客户端
  static async getAll() {
    try {
      const result = await query(`
        SELECT * FROM ai_clients ORDER BY created_at DESC
      `);

      return result.rows.map(row => ({
        ...row,
        ai_config: typeof row.ai_config === 'string' ? JSON.parse(row.ai_config) : row.ai_config
      }));
    } catch (error) {
      console.error('获取AI客户端列表失败:', error);
      throw error;
    }
  }

  // 根据ID获取AI客户端
  static async getById(clientId) {
    try {
      const result = await query(`
        SELECT * FROM ai_clients WHERE id = $1
      `, [clientId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        ai_config: typeof row.ai_config === 'string' ? JSON.parse(row.ai_config) : row.ai_config
      };
    } catch (error) {
      console.error('获取AI客户端失败:', error);
      throw error;
    }
  }

  // 清理过期的AI客户端
  static async cleanup(olderThanMinutes = 60) {
    try {
      const result = await query(`
        DELETE FROM ai_clients 
        WHERE status IN ('disconnected', 'error') 
          AND updated_at < NOW() - INTERVAL '${olderThanMinutes} minutes'
        RETURNING *
      `);

      console.log(`清理了 ${result.rows.length} 个过期的AI客户端`);
      return result.rows;
    } catch (error) {
      console.error('清理AI客户端失败:', error);
      throw error;
    }
  }

  // 更新心跳时间
  static async updateHeartbeat(clientId) {
    try {
      const result = await query(`
        UPDATE ai_clients 
        SET last_seen = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [clientId]);

      return result.rows[0];
    } catch (error) {
      console.error('更新AI客户端心跳失败:', error);
      throw error;
    }
  }
}

module.exports = AIClientModel;
