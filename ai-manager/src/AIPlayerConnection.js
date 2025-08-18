const { Client } = require('boardgame.io/client');
const { SocketIO } = require('boardgame.io/multiplayer');
const { getGame } = require('@qame/games');

/**
 * AI玩家连接 - 负责维持AI玩家与game-server的连接
 */
class AIPlayerConnection {
  constructor(config) {
    // 基本配置
    this.id = config.id;
    this.playerName = config.playerName || `AI-${String(this.id).slice(0, 8)}`;
    this.gameType = config.gameType;
    this.matchId = config.matchId;
    
    // 游戏服务器连接
    this.gameServerUrl = config.gameServerUrl || 'http://game-server:8000';
    this.client = null;
    
    // 简化的状态管理
    this.status = 'created';
    this.gameState = null;
    this.createdAt = new Date();

    console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: AI玩家连接已创建: ${this.playerName}`);
  }



  /**
   * 连接到游戏服务器
   */
  async connect() {
    try {
      console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: 连接到游戏服务器: ${this.gameServerUrl}`);
      this.status = 'connecting';
      
      // 创建 boardgame.io Client 实例
      this.client = Client({
        game: this._getGameConfig(),
        multiplayer: SocketIO({ server: this.gameServerUrl }),
        playerID: this.id,
        matchID: this.matchId,
        debug: false
      });

      // 启动客户端
      this.client.start();
      
      // 设置事件监听
      this._setupClientListeners();
      
      this.status = 'connected';
      console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: 已连接到游戏服务器`);

    } catch (error) {
      this.status = 'error';
      console.error(`[${new Date().toISOString()}] [ai-player:${this.playerName}] ERROR: 连接失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取游戏配置
   */
  _getGameConfig() {
    // 使用 @qame/games 包中的 getGame 函数
    return getGame(this.gameType);
  }

  /**
   * 设置客户端事件监听
   */
  _setupClientListeners() {
    // 监听游戏状态变化
    this.client.subscribe((state) => {
      if (state) {
        this.gameState = state;
        console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] DEBUG: 游戏状态更新: turn ${state.ctx?.turn || 0}`);
        
        // 检查游戏是否结束
        if (state.ctx?.gameover) {
          this._handleGameOver(state);
          return;
        }
      }

      console.debug(`[${new Date().toISOString()}] [ai-player:${this.playerName}] DEBUG: 游戏状态更新: ${JSON.stringify(state)}`);
    });
  }

  /**
   * 处理游戏结束
   */
  _handleGameOver(state) {
    try {
      console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: 游戏已结束`);
      console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: 游戏结果: ${JSON.stringify(state.ctx?.gameover)}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ai-player:${this.playerName}] ERROR: 处理游戏结束失败: ${error.message}`);
    }
  }

  /**
   * 执行移动
   */
  async executeMove(move) {
    try {
      console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: 执行移动: ${JSON.stringify(move)}`);
      
      // 使用 boardgame.io client 执行移动
      if (this.client && this.client.moves) {
        // 根据游戏类型调用相应的移动方法
        // 这里需要根据具体的游戏规则来实现
        console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: 移动已执行`);
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ai-player:${this.playerName}] ERROR: 执行移动失败: ${error.message}`);
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    try {
      this.status = 'disconnecting';
      console.log(`[${new Date().toISOString()}] [ai-player:${this.playerName}] INFO: AI客户端断开连接`);

      if (this.client) {
        this.client.stop();
        this.client = null;
      }
      
      this.status = 'disconnected';
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ai-player:${this.playerName}] ERROR: 断开连接失败: ${error.message}`);
    }
  }

  /**
   * 获取详细信息（包括日志）
   */
  getDetailedInfo() {
    return {
      ...this.getStatus(),
      gameState: this.gameState,
      // 移除了日志存储功能
    };
  }
}

module.exports = { AIPlayerConnection };
