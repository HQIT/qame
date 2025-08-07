const io = require('socket.io-client');
const { LLMService } = require('./LLMService');
const { GameStateAnalyzer } = require('./GameStateAnalyzer');

/**
 * 简化的AI客户端 - 使用连接而非独立进程
 */
class SimpleAIClient {
  constructor(config) {
    this.id = config.id;
    this.playerName = config.playerName || `AI-${this.id.slice(0, 8)}`;
    this.gameType = config.gameType;
    this.aiConfig = config.aiConfig;
    
    // 游戏服务器连接
    this.gameServerUrl = config.gameServerUrl || 'http://game-server:8000';
    this.socket = null;
    this.gameClient = null;
    
    // AI服务
    this.llmService = new LLMService(this.aiConfig);
    this.analyzer = new GameStateAnalyzer(this.gameType);
    
    // 状态管理
    this.status = 'created';
    this.matchId = config.matchId;
    this.playerID = null;
    this.credentials = null;
    this.gameState = null;
    this.logs = [];
    this.createdAt = new Date();
    
    // 心跳定时器
    this.heartbeatInterval = null;
    
    this.log('info', `AI客户端已创建: ${this.playerName}`);
  }

  /**
   * 连接到游戏服务器
   */
  async connect() {
    try {
      this.log('info', `连接到游戏服务器: ${this.gameServerUrl}`);
      this.status = 'connecting';
      
      // 创建Socket.IO连接
      this.socket = io(this.gameServerUrl, {
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 10000
      });

      // 设置连接事件监听
      this.setupSocketListeners();
      
      // 等待连接建立
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('连接超时'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.status = 'connected';
          this.log('info', '已连接到游戏服务器');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.log('error', `连接失败: ${error.message}`);
          reject(error);
        });
      });

      // 如果有指定的match，尝试加入
      if (this.matchId && this.matchId !== 'lobby') {
        await this.joinMatch(this.matchId);
      }

      // 启动心跳
      this.startHeartbeat();

    } catch (error) {
      this.status = 'error';
      this.log('error', `连接失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置Socket监听器
   */
  setupSocketListeners() {
    this.socket.on('disconnect', () => {
      this.status = 'disconnected';
      this.log('info', '与游戏服务器断开连接');
    });

    this.socket.on('error', (error) => {
      this.log('error', `Socket错误: ${error}`);
    });

    // 监听游戏状态更新
    this.socket.on('sync', (gameID, syncInfo) => {
      this.handleGameSync(gameID, syncInfo);
    });

    // 监听游戏事件
    this.socket.on('update', (gameID, syncInfo) => {
      this.handleGameUpdate(gameID, syncInfo);
    });
  }

  /**
   * 加入游戏匹配
   */
  async joinMatch(matchId) {
    try {
      this.log('info', `尝试加入游戏匹配: ${matchId}`);
      
      // 这里应该调用API获取匹配信息和凭证
      const matchInfo = await this.getMatchInfo(matchId);
      
      if (matchInfo) {
        this.matchId = matchInfo.matchId;
        this.playerID = matchInfo.playerID;
        this.credentials = matchInfo.credentials;
        
        // 连接到specific game
        this.socket.emit('sync', this.matchId, this.playerID, this.credentials);
        this.log('info', `已加入游戏: ${this.matchId}, 玩家ID: ${this.playerID}`);
      }
    } catch (error) {
      this.log('error', `加入游戏失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取匹配信息（需要调用API服务器）
   */
  async getMatchInfo(matchId) {
    // 这里应该调用API服务器获取匹配信息
    // 暂时返回模拟数据
    return {
      matchId: matchId,
      playerID: '1', // 通常AI是玩家1
      credentials: 'ai-credentials'
    };
  }

  /**
   * 处理游戏状态同步
   */
  handleGameSync(gameID, syncInfo) {
    try {
      if (gameID !== this.matchId) return;
      
      this.gameState = syncInfo;
      this.log('info', `游戏状态同步: turn ${syncInfo.state?.ctx?.turn || 0}`);
      
      // 检查是否轮到AI行动
      this.checkAndMakeMove();
    } catch (error) {
      this.log('error', `处理游戏同步失败: ${error.message}`);
    }
  }

  /**
   * 处理游戏更新
   */
  handleGameUpdate(gameID, syncInfo) {
    this.handleGameSync(gameID, syncInfo);
  }

  /**
   * 检查并执行AI移动
   */
  async checkAndMakeMove() {
    try {
      if (!this.gameState || !this.gameState.state) return;
      
      const { ctx } = this.gameState.state;
      
      // 检查游戏是否结束
      if (ctx.gameover) {
        this.log('info', '游戏已结束');
        return;
      }
      
      // 检查是否轮到当前AI玩家
      if (ctx.currentPlayer !== this.playerID) {
        return; // 不是AI的回合
      }
      
      this.log('info', `轮到AI行动 (玩家${this.playerID})`);
      
      // 分析游戏状态
      const analysis = this.analyzer.analyze(this.gameState.state, this.playerID);
      
      if (!analysis.availableMoves || analysis.availableMoves.length === 0) {
        this.log('warn', '没有可用的移动');
        return;
      }
      
      // 获取AI决策
      const move = await this.llmService.getMove(analysis);
      
      if (move !== null) {
        await this.executeMove(move);
      } else {
        this.log('warn', 'AI未能生成有效移动');
      }
      
    } catch (error) {
      this.log('error', `AI决策失败: ${error.message}`);
    }
  }

  /**
   * 执行移动
   */
  async executeMove(move) {
    try {
      this.log('info', `执行移动: ${JSON.stringify(move)}`);
      
      // 根据游戏类型构造移动命令
      let moveCommand;
      if (this.gameType === 'tic-tac-toe') {
        moveCommand = {
          type: 'MAKE_MOVE',
          args: [move.position || move]
        };
      } else {
        moveCommand = move;
      }
      
      // 发送移动到游戏服务器
      this.socket.emit('update', this.matchId, moveCommand, this.playerID, this.credentials);
      
    } catch (error) {
      this.log('error', `执行移动失败: ${error.message}`);
    }
  }

  /**
   * 启动心跳
   */
  startHeartbeat() {
    try {
      // 清除已有的心跳定时器
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      // 立即发送一次心跳
      this.sendHeartbeat();
      
      // 每30秒发送一次心跳
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, 30000);
      
      this.log('info', '心跳已启动');
    } catch (error) {
      this.log('error', `启动心跳失败: ${error.message}`);
    }
  }

  /**
   * 发送心跳
   */
  async sendHeartbeat() {
    try {
      // 更新数据库中的last_seen字段
      const AIClientModel = require('./models/AIClient');
      await AIClientModel.updateHeartbeat(this.id);
      this.log('debug', '心跳已发送');
    } catch (error) {
      this.log('error', `发送心跳失败: ${error.message}`);
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    try {
      this.status = 'disconnecting';
      this.log('info', 'AI客户端断开连接');
      
      // 停止心跳
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.status = 'disconnected';
    } catch (error) {
      this.log('error', `断开连接失败: ${error.message}`);
    }
  }

  /**
   * 获取客户端状态
   */
  getStatus() {
    return {
      id: this.id,
      playerName: this.playerName,
      gameType: this.gameType,
      status: this.status,
      matchId: this.matchId,
      playerID: this.playerID,
      createdAt: this.createdAt,
      logCount: this.logs.length,
      lastActivity: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
    };
  }

  /**
   * 记录日志
   */
  log(level, message) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message
    };
    
    this.logs.push(logEntry);
    
    // 限制日志数量
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-50);
    }
    
    console.log(`[${this.id}] ${level.toUpperCase()}: ${message}`);
  }

  /**
   * 获取详细信息（包括日志）
   */
  getDetailedInfo() {
    return {
      ...this.getStatus(),
      aiConfig: this.aiConfig,
      gameState: this.gameState,
      logs: this.logs.slice(-20) // 只返回最近20条日志
    };
  }
}

module.exports = { SimpleAIClient };
