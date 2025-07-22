const { request } = require('undici');
const { query } = require('../config/database');

class AIService {
  // 获取AI类型列表
  static async getAITypes(gameId = null) {
    try {
      let sql = 'SELECT * FROM ai_types WHERE status = $1';
      let params = ['active'];
      
      if (gameId) {
        sql += ' AND $2 = ANY(supported_games)';
        params.push(gameId);
      }
      
      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('获取AI类型失败:', error);
      throw error;
    }
  }
  
  // 根据AI类型ID获取AI信息
  static async getAIType(aiTypeId) {
    try {
      const result = await query(
        'SELECT * FROM ai_types WHERE id = $1 AND status = $2',
        [aiTypeId, 'active']
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('获取AI类型失败:', error);
      throw error;
    }
  }
  
  // 调用AI提供商
  static async callAI(aiTypeId, gameState, config = {}) {
    try {
      const aiType = await this.getAIType(aiTypeId);
      if (!aiType) {
        throw new Error('AI类型不存在或已禁用');
      }
      
      console.log('🤖 调用AI提供商:', {
        aiTypeId,
        aiType: aiType.name,
        endpoint: aiType.endpoint
      });
      
      // 构建请求体
      const requestBody = {
        gameState,
        config: {
          ...aiType.config_schema,
          ...config
        }
      };
      
      // 调用AI提供商
      const { statusCode, body: responseBody } = await request(aiType.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (statusCode !== 200) {
        const errorText = await responseBody.text();
        console.error('❌ AI提供商调用失败:', errorText);
        throw new Error(`AI提供商调用失败: ${statusCode}`);
      }

      const data = JSON.parse(await responseBody.text());
      console.log('📥 AI提供商响应:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ AI调用异常:', error);
      throw error;
    }
  }
  
  // 解析AI返回的移动位置
  static parseMoveResponse(response) {
    const move = response.move;
    
    if (move === undefined || move === null) {
      throw new Error('AI返回的移动位置无效');
    }
    
    if (typeof move !== 'number' || move < 0 || move > 8) {
      throw new Error('AI返回的移动位置超出范围');
    }
    
    return move;
  }
  
  // 获取fallback移动（当AI调用失败时）
  static getFallbackMove(gameState) {
    // 简单的fallback策略：找到第一个可用位置
    const cells = gameState.cells || [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === null) {
        return i;
      }
    }
    return -1; // 没有可用位置
  }
}

module.exports = AIService; 