const { request } = require('undici');
const pg = require('pg');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'boardgame_db',
  user: process.env.DB_USER || 'boardgame_user',
  password: process.env.DB_PASSWORD || 'boardgame_pass',
};

class AIService {
  constructor() {
    this.pool = new pg.Pool(dbConfig);
  }

  /**
   * 查询数据库
   */
  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * 获取match中的AI玩家信息
   * @param {string} matchId - Match ID
   * @returns {Array} AI玩家列表
   */
  async getAIPlayers(matchId) {
    try {
      const result = await this.query(`
        SELECT 
          mp.*,
          at.endpoint,
          at.config_schema,
          at.name as ai_type_name
        FROM match_players mp
        JOIN ai_types at ON mp.ai_type_id = at.id
        WHERE mp.match_id = $1 
        AND mp.player_type = 'ai' 
        AND mp.status = 'joined'
        ORDER BY mp.seat_index
      `, [matchId]);

      return result.rows;
    } catch (error) {
      console.error('❌ 获取AI玩家信息失败:', error);
      return [];
    }
  }

  /**
   * 调用AI提供商获取移动
   * @param {Object} aiPlayer - AI玩家信息
   * @param {Object} gameState - 游戏状态
   * @returns {Promise<number>} 移动位置，失败返回-1
   */
  async getAIMove(aiPlayer, gameState) {
    try {
      console.log('🤖 [Server AI] 调用AI提供商:', {
        aiTypeName: aiPlayer.ai_type_name,
        endpoint: aiPlayer.endpoint,
        seatIndex: aiPlayer.seat_index
      });

      // 生成提示词
      const prompt = this.generateGamePrompt(gameState.cells, aiPlayer.seat_index.toString());
      
      // 构建请求体
      let configSchema = {};
      let aiConfig = {};
      
      try {
        configSchema = JSON.parse(aiPlayer.config_schema || '{}');
      } catch (e) {
        console.warn('⚠️ [Server AI] 无效的config_schema JSON:', aiPlayer.config_schema);
      }
      
      try {
        aiConfig = JSON.parse(aiPlayer.ai_config || '{}');
      } catch (e) {
        console.warn('⚠️ [Server AI] 无效的ai_config JSON:', aiPlayer.ai_config);
      }
      
      const requestBody = {
        prompt,
        config: {
          ...configSchema,
          ...aiConfig
        }
      };

      console.log('📤 [Server AI] 发送请求:', {
        endpoint: aiPlayer.endpoint,
        prompt: prompt.substring(0, 100) + '...',
        config: requestBody.config
      });

      // 调用AI提供商
      const { statusCode, body: responseBody } = await request(aiPlayer.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: 10000 // 10秒超时
      });

      const responseText = await responseBody.text();

      if (statusCode !== 200) {
        console.error('❌ [Server AI] AI提供商调用失败:', responseText);
        throw new Error(`AI提供商调用失败: ${statusCode}`);
      }

      const data = JSON.parse(responseText);
      console.log('📥 [Server AI] AI提供商响应:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      const move = data.move;
      if (typeof move !== 'number' || move < 0 || move > 8) {
        console.error('❌ [Server AI] 无效的移动位置:', move);
        throw new Error('AI返回的移动位置无效');
      }

      // 验证移动位置是否可用
      if (gameState.cells[move] !== null) {
        console.error('❌ [Server AI] 移动位置已被占用:', move);
        throw new Error('AI选择的位置已被占用');
      }

      console.log('✅ [Server AI] 成功获取AI移动:', move);
      return move;

    } catch (error) {
      console.error('❌ [Server AI] AI调用失败:', error);
      return this.getFallbackMove(gameState.cells);
    }
  }

  /**
   * 生成游戏提示词
   * @param {Array} cells - 棋盘状态
   * @param {string} playerID - 玩家ID
   * @returns {string} 提示词
   */
  generateGamePrompt(cells, playerID) {
    const playerSymbol = playerID === '0' ? 'X' : 'O';
    const opponentSymbol = playerID === '0' ? 'O' : 'X';
    
    const symbols = {
      '0': 'X',
      '1': 'O',
      null: ' '
    };
    
    const board = [
      ` ${symbols[cells[0]]} | ${symbols[cells[1]]} | ${symbols[cells[2]]} `,
      '---+---+---',
      ` ${symbols[cells[3]]} | ${symbols[cells[4]]} | ${symbols[cells[5]]} `,
      '---+---+---',
      ` ${symbols[cells[6]]} | ${symbols[cells[7]]} | ${symbols[cells[8]]} `
    ].join('\n');
    
    return `你正在玩井字棋游戏。你是玩家${playerSymbol}，对手是玩家${opponentSymbol}。

当前棋盘状态：
${board}

位置索引说明：
0 | 1 | 2
---+---+---
3 | 4 | 5
---+---+---
6 | 7 | 8

游戏策略指导：
1. 优先选择能够立即获胜的位置
2. 阻止对手在下一步获胜
3. 优先选择中心位置(4)
4. 选择角落位置(0,2,6,8)
5. 最后选择边缘位置(1,3,5,7)

请分析当前局势，选择最佳移动位置。只返回一个数字(0-8)，不要包含任何其他文字或解释。

你的选择：`;
  }

  /**
   * 获取fallback移动（当AI调用失败时）
   * @param {Array} cells - 棋盘状态
   * @returns {number} 移动位置
   */
  getFallbackMove(cells) {
    console.log('🔄 [Server AI] 使用fallback策略');
    
    // 简单策略：优先中心，然后角落，最后边缘
    const priorities = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    
    for (const pos of priorities) {
      if (cells[pos] === null) {
        console.log('🔄 [Server AI] Fallback选择位置:', pos);
        return pos;
      }
    }
    
    return -1; // 没有可用位置
  }

  /**
   * 关闭连接池
   */
  async close() {
    await this.pool.end();
  }
}

// 创建单例实例
const aiService = new AIService();

module.exports = aiService;