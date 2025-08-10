const { request } = require('undici');
const pg = require('pg');

// 使用Node.js内置的fetch（Node 18+）或polyfill
const fetch = globalThis.fetch || require('undici').fetch;

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
   * 获取match中的AI玩家信息（新架构）
   * @param {string} matchId - Match ID
   * @returns {Array} AI玩家列表，包含关联的AI客户端信息
   */
  async getAIPlayers(matchId) {
    try {
      const result = await this.query(`
        SELECT 
          mp.*,
          ap.player_name as ai_player_name,
          ap.ai_client_id,
          ac.name as client_name,
          ac.endpoint as client_endpoint,
          ac.supported_games as client_supported_games,
          ac.description as client_description
        FROM match_players mp
        LEFT JOIN ai_players ap ON mp.player_name = ap.player_name
        LEFT JOIN ai_clients ac ON ap.ai_client_id = ac.id
        WHERE mp.match_id = $1 
          AND mp.player_type = 'ai' 
          AND mp.status = 'joined'
        ORDER BY mp.seat_index
      `, [matchId]);

      return result.rows.map(row => ({
        ...row,
        // 兼容旧接口的字段
        ai_config: null, // 新架构中不再使用
        // 新架构的字段
        ai_client: row.ai_client_id ? {
          id: row.ai_client_id,
          name: row.client_name,
          endpoint: row.client_endpoint,
          supported_games: typeof row.client_supported_games === 'string' 
            ? JSON.parse(row.client_supported_games) 
            : row.client_supported_games,
          description: row.client_description
        } : null
      }));
    } catch (error) {
      console.error('❌ 获取AI玩家信息失败:', error);
      return [];
    }
  }



  /**
   * 通过AI客户端获取移动（新架构）
   * @param {Object} aiPlayer - AI玩家信息
   * @param {Object} gameState - 游戏状态
   * @returns {Promise<number>} 移动位置，失败返回-1
   */
  async getAIMove(aiPlayer, gameState) {
    console.log('🤖 [AI Service] 调用AI客户端获取移动');

    // 检查AI客户端信息
    if (!aiPlayer.ai_client || !aiPlayer.ai_client.endpoint) {
      console.error('❌ [AI Service] AI玩家没有关联的AI客户端或缺少端点信息');
      return -1;
    }

    const aiClient = aiPlayer.ai_client;
    console.log('📤 [AI Service] 调用AI客户端:', {
      clientName: aiClient.name,
      endpoint: aiClient.endpoint,
      playerSeat: aiPlayer.seat_index
    });

    try {
      // 构建标准的/move接口请求（基于boardgame.io格式）
      const moveRequest = {
        match_id: gameState.G.matchId || 'unknown',
        player_id: aiPlayer.id, // 使用真实的player ID
        game_id: 'tic-tac-toe', // 使用games表中的ID
        G: gameState.G, // 完整的游戏数据
        ctx: gameState.ctx, // 游戏上下文
        metadata: {
          playerIndex: aiPlayer.seat_index,
          playerSymbol: aiPlayer.seat_index === 0 ? 'X' : 'O'
        }
      };

      const timeout = parseInt(process.env.AI_SERVICE_TIMEOUT) || 300000; // 可配置超时，默认5分钟
      console.log('🧠 [AI Service] 调用AI客户端API...');
      console.log('⏱️ [AI Service] 超时设置:', timeout + 'ms');
      console.log('📤 [AI Service] 请求数据:', JSON.stringify(moveRequest, null, 2));
      
      const response = await fetch(aiClient.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moveRequest),
        signal: AbortSignal.timeout(timeout) // 可配置超时时间
      });

      if (!response.ok) {
        console.error('❌ [AI Service] AI客户端API请求失败:', response.status, await response.text());
        return -1;
      }

      const data = await response.json();
      console.log('🧠 [AI Service] AI客户端响应:', data);
      
      // 标准化响应格式处理
      let move = -1;
      if (typeof data === 'number') {
        move = data;
      } else if (data.move !== undefined) {
        move = data.move;
      } else if (data.position !== undefined) {
        move = data.position;
      } else if (data.data && data.data.move !== undefined) {
        move = data.data.move;
      }
      
      // 验证移动有效性
      if (!isNaN(move) && move >= 0 && move <= 8 && gameState.G.cells[move] === null) {
        console.log('✅ [AI Service] AI客户端选择有效位置:', move);
        return move;
      } else {
        console.error('❌ [AI Service] AI客户端返回无效位置:', { 
          move, 
          response: data, 
          availablePositions: gameState.G.cells.map((cell, i) => cell === null ? i : null).filter(x => x !== null) 
        });
        return -1;
      }

    } catch (error) {
      console.error('❌ [AI Service] AI客户端调用失败:', error.message);
      return -1;
    }
  }

  /**
   * 根据AI玩家名称获取AI玩家信息
   * @param {string} playerName - AI玩家名称
   * @returns {Object|null} AI玩家信息
   */
  async getAIPlayerByName(playerName) {
    try {
      const result = await this.query(`
        SELECT 
          ap.*,
          ac.name as client_name,
          ac.endpoint as client_endpoint,
          ac.supported_games as client_supported_games,
          ac.description as client_description
        FROM ai_players ap
        LEFT JOIN ai_clients ac ON ap.ai_client_id = ac.id
        WHERE ap.player_name = $1 AND ap.status = 'active'
      `, [playerName]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        ai_client: row.ai_client_id ? {
          id: row.ai_client_id,
          name: row.client_name,
          endpoint: row.client_endpoint,
          supported_games: typeof row.client_supported_games === 'string' 
            ? JSON.parse(row.client_supported_games) 
            : row.client_supported_games,
          description: row.client_description
        } : null
      };
    } catch (error) {
      console.error('❌ 根据名称获取AI玩家失败:', error);
      return null;
    }
  }

  /**
   * 检查AI客户端是否支持指定游戏
   * @param {string} clientId - AI客户端ID
   * @param {string} gameType - 游戏类型
   * @returns {Promise<boolean>} 是否支持
   */
  async checkClientSupportsGame(clientId, gameType) {
    try {
      const result = await this.query(`
        SELECT supported_games 
        FROM ai_clients 
        WHERE id = $1
      `, [clientId]);

      if (result.rows.length === 0) {
        return false;
      }

      const supportedGames = typeof result.rows[0].supported_games === 'string' 
        ? JSON.parse(result.rows[0].supported_games) 
        : result.rows[0].supported_games;

      return supportedGames.includes(gameType);
    } catch (error) {
      console.error('❌ 检查AI客户端游戏支持失败:', error);
      return false;
    }
  }

  /**
   * 获取所有活跃的AI玩家
   * @returns {Array} 活跃的AI玩家列表
   */
  async getActiveAIPlayers() {
    try {
      const result = await this.query(`
        SELECT 
          ap.*,
          ac.name as client_name,
          ac.endpoint as client_endpoint,
          ac.supported_games as client_supported_games
        FROM ai_players ap
        LEFT JOIN ai_clients ac ON ap.ai_client_id = ac.id
        WHERE ap.status = 'active'
        ORDER BY ap.created_at DESC
      `);

      return result.rows.map(row => ({
        ...row,
        ai_client: row.ai_client_id ? {
          id: row.ai_client_id,
          name: row.client_name,
          endpoint: row.client_endpoint,
          supported_games: typeof row.client_supported_games === 'string' 
            ? JSON.parse(row.client_supported_games) 
            : row.client_supported_games
        } : null
      }));
    } catch (error) {
      console.error('❌ 获取活跃AI玩家失败:', error);
      return [];
    }
  }

  /**
   * 生成游戏提示词（兼容性保留，但在新架构中由AI客户端自己处理）
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

请分析当前局势，选择最佳移动位置。只返回一个数字(0-8)。`;
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