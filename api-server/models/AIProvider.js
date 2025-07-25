const { query } = require('../config/database');

class AIProvider {
  // 创建新的AI提供商
  static async create(name, description, status = 'active') {
    try {
      const result = await query(
        'INSERT INTO ai_providers (name, description, status) VALUES ($1, $2, $3) RETURNING *',
        [name, description, status]
      );

      return result.rows[0];
    } catch (error) {
      console.error('创建AI提供商失败:', error);
      throw error;
    }
  }

  // 获取所有AI提供商
  static async findAll() {
    try {
      const result = await query(
        'SELECT * FROM ai_providers ORDER BY created_at DESC'
      );
      
      return result.rows;
    } catch (error) {
      console.error('获取AI提供商列表失败:', error);
      throw error;
    }
  }

  // 根据ID查找AI提供商
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM ai_providers WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找AI提供商失败:', error);
      throw error;
    }
  }

  // 更新AI提供商
  static async update(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'id' && key !== 'created_at') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      values.push(id);
      
      const result = await query(
        `UPDATE ai_providers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      return result.rows[0];
    } catch (error) {
      console.error('更新AI提供商失败:', error);
      throw error;
    }
  }

  // 删除AI提供商
  static async delete(id) {
    try {
      // 检查是否有关联的AI类型
      const aiTypesResult = await query(
        'SELECT COUNT(*) as count FROM ai_types WHERE provider_id = $1',
        [id]
      );
      
      if (parseInt(aiTypesResult.rows[0].count) > 0) {
        throw new Error('该AI提供商下还有AI类型，请先删除所有关联的AI类型');
      }

      const result = await query(
        'DELETE FROM ai_providers WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('删除AI提供商失败:', error);
      throw error;
    }
  }

  // 获取AI提供商统计信息
  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count
        FROM ai_providers
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('获取AI提供商统计失败:', error);
      throw error;
    }
  }
}

module.exports = AIProvider;