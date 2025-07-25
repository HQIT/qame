const { query } = require('../config/database');

class AIType {
  // 创建新的AI类型
  static async create(providerId, name, description, endpoint, configSchema = {}, supportedGames = [], status = 'active') {
    try {
      const result = await query(
        'INSERT INTO ai_types (provider_id, name, description, endpoint, config_schema, supported_games, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [providerId, name, description, endpoint, JSON.stringify(configSchema), supportedGames, status]
      );

      return result.rows[0];
    } catch (error) {
      console.error('创建AI类型失败:', error);
      throw error;
    }
  }

  // 获取所有AI类型（包含提供商信息）
  static async findAll() {
    try {
      const result = await query(`
        SELECT 
          at.*,
          ap.name as provider_name,
          ap.description as provider_description
        FROM ai_types at
        LEFT JOIN ai_providers ap ON at.provider_id = ap.id
        ORDER BY at.created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('获取AI类型列表失败:', error);
      throw error;
    }
  }

  // 根据游戏获取支持的AI类型
  static async findByGame(gameId) {
    try {
      const result = await query(`
        SELECT 
          at.*,
          ap.name as provider_name,
          ap.description as provider_description
        FROM ai_types at
        LEFT JOIN ai_providers ap ON at.provider_id = ap.id
        WHERE at.status = 'active' 
        AND $1 = ANY(at.supported_games)
        ORDER BY at.created_at DESC
      `, [gameId]);
      
      return result.rows;
    } catch (error) {
      console.error('根据游戏获取AI类型失败:', error);
      throw error;
    }
  }

  // 根据ID查找AI类型
  static async findById(id) {
    try {
      const result = await query(`
        SELECT 
          at.*,
          ap.name as provider_name,
          ap.description as provider_description
        FROM ai_types at
        LEFT JOIN ai_providers ap ON at.provider_id = ap.id
        WHERE at.id = $1
      `, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找AI类型失败:', error);
      throw error;
    }
  }

  // 更新AI类型
  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'created_at') {
          if (key === 'config_schema') {
            fields.push(`config_schema = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else if (key === 'supported_games') {
            fields.push(`supported_games = $${paramIndex}`);
            values.push(value);
          } else {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      values.push(id);
      
      const result = await query(
        `UPDATE ai_types SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      return result.rows[0];
    } catch (error) {
      console.error('更新AI类型失败:', error);
      throw error;
    }
  }

  // 删除AI类型
  static async delete(id) {
    try {
      // 检查是否被房间座位引用
      const roomSeatsResult = await query(
        'SELECT COUNT(*) as count FROM room_seats WHERE ai_type_id = $1',
        [id]
      );
      
      if (parseInt(roomSeatsResult.rows[0].count) > 0) {
        throw new Error('该AI类型正在被房间使用，请先移除房间中的AI玩家');
      }

      const result = await query(
        'DELETE FROM ai_types WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('删除AI类型失败:', error);
      throw error;
    }
  }

  // 获取AI类型统计信息
  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count
        FROM ai_types
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('获取AI类型统计失败:', error);
      throw error;
    }
  }
}

module.exports = AIType; 