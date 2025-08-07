const { Server, Origins } = require('boardgame.io/server');
const TicTacToe = require('./games/TicTacToe');
const aiService = require('./services/aiService');
const { request } = require('undici');

// 添加全局错误处理
process.on('uncaughtException', (err) => {
  console.log('全局错误:', err.message);
  console.log('错误堆栈:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('未处理的 Promise 拒绝:', reason);
});

// 创建boardgame.io服务器
const server = Server({
  games: [TicTacToe],
  origins: [
    // 允许本地开发环境连接
    Origins.LOCALHOST_IN_DEVELOPMENT,
    // 允许前端应用连接
    'http://localhost:3000',
    'http://localhost:80',
    'http://192.168.1.156:3000',
    'http://192.168.1.156:80'
  ],
});

// AI轮询管理器
class AIManager {
  constructor() {
    this.pollingInterval = 2000; // 2秒检查一次
    this.activeMatches = new Set(); // 活跃的matches
    this.processingMatches = new Set(); // 正在处理的matches
    this.processedTurns = new Map(); // 记录已处理的轮次: matchId -> {turn, currentPlayer}
    this.apiServerUrl = process.env.API_SERVER_URL || 'http://api-server:8001';
    this.gameServerUrl = 'http://localhost:8000';
    this.internalServiceKey = process.env.INTERNAL_SERVICE_KEY || 'internal-service-secret-key-2024';
  }

  start() {
    console.log('🤖 [AI Manager] AI系统已迁移到游戏逻辑层面');
    console.log('💡 [AI Manager] 游戏逻辑直接调用AI API，无需额外轮询');
    console.log('🎯 [AI Manager] 架构优化：后端AI决策 + 前端被动接收');
    // AI逻辑现在在 TicTacToe.js 的 onTurn 钩子中处理
    // 无需独立的轮询服务
  }

  async checkActiveMatches() {
    try {
      // 获取活跃的matches
      const matches = await this.getActiveMatches();
      
      for (const match of matches) {
        // 避免重复处理同一个match
        if (this.processingMatches.has(match.id)) {
          continue;
        }

        await this.processMatch(match);
      }
    } catch (error) {
      console.error('❌ [AI Manager] 检查活跃matches失败:', error);
    }
  }

  async getActiveMatches() {
    try {
      const response = await request(`${this.apiServerUrl}/api/matches?status=playing`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': this.internalServiceKey
        }
      });

      if (response.statusCode !== 200) {
        throw new Error(`获取matches失败: ${response.statusCode}`);
      }

      const data = JSON.parse(await response.body.text());
      return data.data || [];
    } catch (error) {
      console.error('❌ [AI Manager] 获取活跃matches失败:', error);
      return [];
    }
  }

  async processMatch(match) {
    this.processingMatches.add(match.id);
    
    try {
      console.log(`🎮 [AI Manager] 处理Match: ${match.id.substring(0, 8)}...`);

      // 获取游戏状态
      const gameState = await this.getGameState(match);
      if (!gameState) {
        console.log(`⚠️ [AI Manager] 游戏状态为空，跳过处理`);
        return;
      }

      console.log(`🔍 [AI Manager] 游戏状态:`, {
        hasCtx: !!gameState.ctx,
        hasG: !!gameState.G,
        gameStateKeys: Object.keys(gameState)
      });

      if (!gameState.ctx) {
        console.log(`⚠️ [AI Manager] 游戏上下文为空，跳过处理。完整状态:`, gameState);
        return;
      }

      // 检查是否轮到AI玩家
      const currentPlayer = gameState.ctx.currentPlayer;
      const aiPlayers = match.players.filter(p => p.isAI);
      const currentAIPlayer = aiPlayers.find(ai => ai.seatIndex.toString() === currentPlayer);

      if (currentAIPlayer && !gameState.ctx.gameover) {
        // 检查这个轮次是否已经处理过
        const matchId = match.id;
        const currentTurn = gameState.ctx.turn;
        const turnKey = `${matchId}-${currentTurn}-${currentPlayer}`;
        
        const lastProcessed = this.processedTurns.get(matchId);
        const alreadyProcessed = lastProcessed && 
                                lastProcessed.turn === currentTurn && 
                                lastProcessed.currentPlayer === currentPlayer;
        
        if (alreadyProcessed) {
          console.log(`⏭️ [AI Manager] 轮次已处理: T${currentTurn} P${currentPlayer}`);
          return;
        }
        
        console.log(`🤖 [AI Manager] 轮到AI玩家: ${currentAIPlayer.playerName} (T${currentTurn})`);
        
        // 记录这个轮次正在处理
        this.processedTurns.set(matchId, {
          turn: currentTurn,
          currentPlayer: currentPlayer,
          timestamp: Date.now()
        });
        
        await this.executeAIMove(match, currentAIPlayer, gameState);
      }

    } catch (error) {
      console.error(`❌ [AI Manager] 处理Match失败:`, error);
    } finally {
      this.processingMatches.delete(match.id);
    }
  }

  async getGameState(match) {
    try {
      const bgioMatchId = match.bgio_match_id || match.id;
      const url = `${this.gameServerUrl}/games/${match.game_id}/${bgioMatchId}`;
      
      console.log(`🔍 [AI Manager] 获取游戏状态:`, {
        matchId: match.id,
        bgioMatchId,
        gameId: match.game_id,
        url
      });
      
      const response = await request(url, {
        method: 'GET'
      });

      console.log(`📡 [AI Manager] 游戏状态响应: ${response.statusCode}`);

      if (response.statusCode !== 200) {
        const errorText = await response.body.text();
        console.log(`❌ [AI Manager] 游戏状态错误内容:`, errorText);
        
        // 如果是404错误（match不存在），创建初始状态用于测试
        if (response.statusCode === 404) {
          console.log(`🎯 [AI Manager] boardgame.io状态丢失，创建测试状态用于AI测试`);
          return {
            G: {
              cells: Array(9).fill(null) // 空棋盘
            },
            ctx: {
              currentPlayer: '1', // 让AI玩家先手
              gameover: false,
              turn: 1
            },
            matchInfo: match
          };
        }
        
        throw new Error(`获取游戏状态失败: ${response.statusCode}`);
      }

      const matchInfo = JSON.parse(await response.body.text());
      
      // 如果没有游戏状态，创建一个初始状态来测试AI
      if (!matchInfo.ctx && !matchInfo.G) {
        console.log(`🎯 [AI Manager] 检测到新游戏，创建测试状态`);
        return {
          G: {
            cells: Array(9).fill(null) // 空棋盘
          },
          ctx: {
            currentPlayer: '1', // 让AI先手测试
            gameover: false,
            turn: 1
          },
          matchInfo: matchInfo
        };
      }
      
      console.log(`✅ [AI Manager] 成功获取游戏状态`);
      return matchInfo;
    } catch (error) {
      console.error(`❌ [AI Manager] 获取游戏状态失败:`, error);
      return null;
    }
  }

  async executeAIMove(match, aiPlayer, gameState) {
    try {
      console.log(`🤖 [AI Manager] 为AI玩家获取移动: ${aiPlayer.playerName}`);

      // 从数据库获取AI类型信息
      const aiPlayers = await aiService.getAIPlayers(match.id);
      const aiPlayerInfo = aiPlayers.find(ai => ai.seat_index === aiPlayer.seatIndex);

      if (!aiPlayerInfo) {
        console.error(`❌ [AI Manager] 未找到AI玩家信息: ${aiPlayer.seatIndex}`);
        return;
      }

      // 获取AI移动
      const move = await aiService.getAIMove(aiPlayerInfo, gameState.G);
      if (move === -1) {
        console.error(`❌ [AI Manager] AI未能选择有效移动`);
        return;
      }

      console.log(`🤖 [AI Manager] AI选择移动: ${move}`);

      // 执行移动
      await this.executeMove(match, aiPlayer.seatIndex, move);

    } catch (error) {
      console.error(`❌ [AI Manager] 执行AI移动失败:`, error);
    }
  }

  async executeMove(match, playerIndex, move) {
    console.log(`🎯 [AI Manager] AI决策完成，建议移动到位置: ${move}`);
    console.log(`📝 [AI Manager] 等待前端WebSocket客户端执行移动...`);
    
    // 注意：后端AI Manager提供智能决策
    // 前端负责通过WebSocket执行实际移动
    // 这种分工是合理的架构设计
  }
}

// 启动服务器
server.run(8000, () => {
  console.log('🎮 Boardgame.io 服务器运行在端口 8000');
  
  // 启动AI管理器
  const aiManager = new AIManager();
  aiManager.start();
}); 