const { Server, Origins } = require('boardgame.io/server');
const Router = require('@koa/router');
const TicTacToe = require('./games/TicTacToe');
const aiService = require('./services/aiService');
const { request } = require('undici');
const { Client } = require('boardgame.io/client');
const { SocketIO } = require('boardgame.io/multiplayer');

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

// 轻量自定义路由（健康检查 / ai ping / 游戏列表）挂在 boardgame.io 的 Koa app
const router = new Router();
let aiManagerRef = null;
router.get('/ai/ping', async (ctx) => {
  if (aiManagerRef) aiManagerRef.wake();
  ctx.body = 'ok';
});

// 获取支持的游戏列表
router.get('/api/games', async (ctx) => {
  try {
    // 返回当前server支持的游戏列表
    const games = server.games.map(game => ({
      name: game.name,
      displayName: game.name === 'TicTacToe' ? 'tic-tac-toe' : game.name.toLowerCase()
    }));
    
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: games.map(game => game.displayName)
    };
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '获取游戏列表失败',
      data: null
    };
  }
});

server.app
  .use(router.routes())
  .use(router.allowedMethods());

// AI轮询管理器
class AIManager {
  constructor() {
    this.pollingInterval = 2000; // 活跃轮询间隔
    this.activeMatches = new Set(); // 活跃的matches
    this.processingMatches = new Set(); // 正在处理的matches
    this.processedTurns = new Map(); // 记录已处理的轮次: matchId -> {turn, currentPlayer}
    this.apiServerUrl = process.env.API_SERVER_URL || 'http://api-server:8001';
    this.gameServerUrl = 'http://game-server:8000';
    this.internalServiceKey = process.env.INTERNAL_SERVICE_KEY || 'internal-service-secret-key-2024';
    this.timerId = null;
    this.isRunning = false;
  }

  start() {
    console.log('🤖 [AI Manager] 启动轮询（每2秒检查一次进行中比赛）');
    this.isRunning = true;
    this._loopOnce();
    this.timerId = setInterval(() => {
      this._loopOnce().catch((e) => console.error('❌ [AI Manager] tick error:', e));
    }, this.pollingInterval);
  }

  wake() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🚀 [AI Manager] 唤醒，开始轮询进行中的比赛');
    this._loopOnce();
  }

  _scheduleNext(delayMs) {
    if (!this.isRunning) return;
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => this._loopOnce(), delayMs);
  }

  async _loopOnce() {
    try {
      console.log(`[AI Manager] tick @ ${new Date().toISOString()}`);
      const matches = await this.getActiveMatches();
      const count = Array.isArray(matches) ? matches.length : 0;
      console.log(`[AI Manager] playing matches: ${count}`);
      
      if (!matches || matches.length === 0) {
        console.log('🛌 [AI Manager] 无进行中比赛');
      } else {
        for (const match of matches) {
          if (!this.processingMatches.has(match.id)) {
            await this.processMatch(match);
          }
        }
      }
      
      // 无论是否有matches都继续轮询
      this._scheduleNext(this.pollingInterval);
    } catch (err) {
      console.error('❌ [AI Manager] 轮询出错:', err);
      this._scheduleNext(5000);
    }
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
      const matches = (data.data || []).map((m) => ({
        ...m,
        players: (m.players || []).map((p) => ({
          seatIndex: p.seatIndex ?? p.seat_index ?? p.id ?? 0,
          isAI: p.isAI ?? (p.playerType === 'ai')
        }))
      }));
      return matches;
    } catch (error) {
      console.error('❌ [AI Manager] 获取活跃matches失败:', error);
      return [];
    }
  }

  async processMatch(match) {
    this.processingMatches.add(match.id);
    
    try {
      console.log(`🎮 [AI Manager] 处理Match: ${match.id.substring(0, 8)}...`);

      // 获取游戏状态（不带 seat 视角）
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

      // 检查是否轮到AI玩家，并且该AI已经join（有credentials）
      const currentPlayer = gameState.ctx.currentPlayer;
      const aiPlayers = (match.players || []).filter(p => p.isAI);
      const currentAIPlayer = aiPlayers.find(ai => String(ai.seatIndex) === String(currentPlayer));

      if (currentAIPlayer && !gameState.ctx.gameover) {
        // 检查节流：同一轮次若在1.5秒内已处理过则跳过，其余情况继续执行
        const matchId = match.id;
        const currentTurn = gameState.ctx.turn || 0;
        const lastProcessed = this.processedTurns.get(matchId);
        const processedSameTurn = lastProcessed && lastProcessed.turn === currentTurn && lastProcessed.currentPlayer === currentPlayer;
        const withinThrottle = processedSameTurn && (Date.now() - lastProcessed.timestamp < 1500);
        if (withinThrottle) {
          console.log(`⏭️ [AI Manager] 本轮已处理(节流): T${currentTurn} P${currentPlayer}`);
          return;
        }

        console.log(`🤖 [AI Manager] 轮到AI玩家: ${currentAIPlayer.playerName || `座位${currentAIPlayer.seatIndex}`} (T${currentTurn})`);

        // 查找该AI的数据库记录，确保已有credentials
        const aiDbPlayers = await aiService.getAIPlayers(match.id);
        const aiDb = aiDbPlayers.find(x => x.seat_index === currentAIPlayer.seatIndex && x.player_credentials);
        
        // 如果AI玩家名称为空，从数据库补充
        if (!currentAIPlayer.playerName && aiDb) {
          currentAIPlayer.playerName = aiDb.player_name;
        }
        if (!aiDb || !aiDb.player_credentials) {
          console.log('⏳ [AI Manager] AI未完成join或缺少credentials，跳过本轮');
          return;
        }

        await this.executeAIMove(match, currentAIPlayer, gameState);

        // 标记为已处理
        this.processedTurns.set(matchId, {
          turn: currentTurn,
          currentPlayer: currentPlayer,
          timestamp: Date.now()
        });
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
      
      console.log(`🔍 [AI Manager] 获取游戏状态:`, {
        matchId: match.id,
        bgioMatchId,
        gameId: match.game_id
      });

      // 获取一个有效的AI玩家凭据来作为观察者获取游戏状态
      const aiPlayers = await aiService.getAIPlayers(match.id);
      let observerCredentials = null;
      let observerPlayerID = null;
      
      if (aiPlayers.length > 0) {
        const aiPlayer = aiPlayers[0];
        if (aiPlayer.player_credentials) {
          observerCredentials = aiPlayer.player_credentials;
          observerPlayerID = aiPlayer.seat_index.toString();
        }
      }

      if (!observerCredentials) {
        console.log('⚠️ [AI Manager] 没有AI玩家凭据，无法获取游戏状态');
        return null;
      }

      // 通过临时客户端获取游戏状态
      return new Promise((resolve, reject) => {
        try {
          const client = Client({
            game: TicTacToe,
            multiplayer: SocketIO({ server: this.gameServerUrl }),
            matchID: bgioMatchId,
            playerID: observerPlayerID,
            credentials: observerCredentials,
            debug: false,
          });

          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              try { client.stop(); } catch (_) {}
              resolve(null);
            }
          }, 3000);

          client.start();
          
          client.subscribe(state => {
            if (!resolved && state && (state.G || state.ctx)) {
              resolved = true;
              clearTimeout(timeout);
              
              console.log(`✅ [AI Manager] 成功获取游戏状态:`, {
                hasG: !!state.G,
                hasCtx: !!state.ctx,
                currentPlayer: state.ctx?.currentPlayer,
                gameover: state.ctx?.gameover
              });
              
              try { client.stop(); } catch (_) {}
              resolve(state);
            }
          });

        } catch (error) {
          console.error(`❌ [AI Manager] 创建临时客户端失败:`, error);
          resolve(null);
        }
      });

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
      const move = await aiService.getAIMove(aiPlayerInfo, gameState);
      if (move === -1) {
        console.error(`❌ [AI Manager] AI未能选择有效移动`);
        // 将错误回传到Game状态，供前端或监控显示
        await this.reportAIErrorToGame(match, aiPlayer.seatIndex, aiPlayerInfo.player_credentials, 'AI unavailable or returned -1');
        return;
      }

      console.log(`🤖 [AI Manager] AI选择移动: ${move}`);

      // 执行移动
      await this.executeMove(match, aiPlayer.seatIndex, move, aiPlayerInfo.player_credentials);

    } catch (error) {
      console.error(`❌ [AI Manager] 执行AI移动失败:`, error);
    }
  }

  async executeMove(match, playerIndex, move, playerCredentials) {
    console.log(`🎯 [AI Manager] 执行AI移动(通过socket): seat=${playerIndex} move=${move}`);
    const bgioMatchId = match.bgio_match_id || match.id;
    
    return new Promise((resolve) => {
      let resolved = false;
      let client = null;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          if (client) {
            try { 
              client.stop(); 
            } catch (e) {
              console.warn('⚠️ [AI Manager] 客户端清理时出错:', e.message);
            }
          }
          resolve();
        }
      };

      // 设置超时保护
      const timeout = setTimeout(() => {
        console.warn('⏱️ [AI Manager] 执行移动超时');
        cleanup();
      }, 5000);

      try {
        client = Client({
          game: TicTacToe,
          multiplayer: SocketIO({ server: this.gameServerUrl }),
          matchID: bgioMatchId,
          playerID: playerIndex.toString(),
          credentials: playerCredentials,
          debug: false,
        });

        // 添加连接事件监听
        client.subscribe((state) => {
          if (!resolved && state && state.ctx && !state.ctx.gameover) {
            console.log(`📡 [AI Manager] 客户端状态更新: currentPlayer=${state.ctx.currentPlayer}`);
            
            // 确保客户端已连接并且有moves对象后再执行移动
            if (client.moves && typeof client.moves.clickCell === 'function') {
              console.log(`🎯 [AI Manager] 执行移动: clickCell(${move})`);
              try {
                client.moves.clickCell(move);
                console.log(`✅ [AI Manager] 移动执行成功`);
                
                // 延迟一下再清理，确保移动被处理
                setTimeout(() => {
                  clearTimeout(timeout);
                  cleanup();
                }, 500);
              } catch (moveError) {
                console.error('❌ [AI Manager] 执行moves.clickCell失败:', moveError.message);
                clearTimeout(timeout);
                cleanup();
              }
            } else {
              console.warn('⚠️ [AI Manager] 客户端moves对象未准备好');
              setTimeout(() => {
                clearTimeout(timeout);
                cleanup();
              }, 1000);
            }
          }
        });

        console.log(`🔌 [AI Manager] 启动客户端连接...`);
        client.start();

      } catch (err) {
        console.error('❌ [AI Manager] 创建客户端失败:', err.message);
        clearTimeout(timeout);
        cleanup();
      }
    });
  }

  async reportAIErrorToGame(match, playerIndex, credentials, message) {
    try {
      const bgioMatchId = match.bgio_match_id || match.id;
      const url = `${this.gameServerUrl}/games/${match.game_id}/${bgioMatchId}/move`;
      const body = {
        move: 'reportAIError',
        args: [message],
        playerID: playerIndex.toString(),
        credentials
      };
      await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (_) {}
  }
}

// 启动服务器
server.run(8000, () => {
  console.log('🎮 Boardgame.io 服务器运行在端口 8000');
  
  // 启动AI管理器
  const aiManager = new AIManager();
  aiManagerRef = aiManager;
  aiManager.start();
});