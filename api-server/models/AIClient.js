const { query } = require('../config/database');

class AIClientModel {
  // 创建AI客户端记录
  static async create(clientData) {
    try {
      const {
        id,
        name,
        endpoint,
        supported_games = [],
        description = ''
      } = clientData;

      const result = await query(`
        INSERT INTO ai_clients (
          id, name, endpoint, supported_games, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [
        id, name, endpoint, supported_games, description
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('创建AI客户端记录失败:', error);
      throw error;
    }
  }

  // 更新AI客户端信息
  static async update(clientId, updateData) {
    try {
      const {
        name,
        endpoint,
        supported_games,
        description
      } = updateData;

      const setClause = ['updated_at = NOW()'];
      const values = [clientId];
      let paramIndex = 2;

      if (name !== undefined) {
        setClause.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }

      if (endpoint !== undefined) {
        setClause.push(`endpoint = $${paramIndex}`);
        values.push(endpoint);
        paramIndex++;
      }

      if (supported_games !== undefined) {
        setClause.push(`supported_games = $${paramIndex}`);
        values.push(supported_games);
        paramIndex++;
      }

      if (description !== undefined) {
        setClause.push(`description = $${paramIndex}`);
        values.push(description);
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
      console.error('更新AI客户端失败:', error);
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

      return result.rows;
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

      return result.rows[0];
    } catch (error) {
      console.error('获取AI客户端失败:', error);
      throw error;
    }
  }

  // 检查AI客户端是否支持指定游戏
  static async supportsGame(clientId, gameType) {
    try {
      const client = await this.getById(clientId);
      if (!client) {
        return false;
      }
      
      return client.supported_games.includes(gameType);
    } catch (error) {
      console.error('检查AI客户端游戏支持失败:', error);
      return false;
    }
  }
}

module.exports = AIClientModel;
