const { v4: uuidv4 } = require('uuid');
const { AIPlayerConnection } = require('./AIPlayerConnection');
const PostgreSQLListener = require('./PostgreSQLListener');

class AIPlayerSessionManager {
  constructor() {
    this.clients = new Map(); // clientId -> client info
    
    // 初始化PostgreSQL监听器
    this.pgListener = new PostgreSQLListener();
    this.pgListener.connect().then(() => {
      this.pgListener.listen('match_status_changes');
      this.pgListener.on('notification:match_status_changes', (data) => {
        if (data.payload.operation === 'UPDATE' && data.payload.new_record?.status === 'playing') {
          this.joinAIPlayersToMatch(data.payload.new_record);
        }
      });
      
      // 启动时扫描已有的playing状态matches
      this.initialScanPlayingMatches();
    });
  }

  /**
   * 启动时扫描已有的playing状态matches
   */
  async initialScanPlayingMatches() {
    try {
      console.log('🔍 [AI Manager] 启动时扫描playing状态的matches...');
      
      const apiServerUrl = process.env.API_SERVER_URL || 'http://api-server:8001';
      const internalServiceKey = process.env.INTERNAL_SERVICE_KEY || 'internal-service-secret-key-2024';
      
      const response = await fetch(`${apiServerUrl}/api/matches?status=playing`, {
        headers: {
          'x-internal-service-key': internalServiceKey
        }
      });
      
      const result = await response.json();
      
      if (result.code === 200 && result.data) {
        const playingMatches = result.data;
        console.log(`📊 [AI Manager] 发现 ${playingMatches.length} 个playing状态的matches`);
        
        // 为每个playing状态的match连接AI玩家
        for (const match of playingMatches) {
          await this.joinAIPlayersToMatch(match);
        }
        
        console.log('✅ [AI Manager] 初始扫描完成');
      } else {
        console.log('⚠️ [AI Manager] 初始扫描API调用失败或返回异常:', result);
      }
    } catch (error) {
      console.error('❌ [AI Manager] 初始扫描失败:', error);
    }
  }

  /**
   * 获取Match中的AI玩家
   */
  async getAIPlayersInMatch(matchId) {
    try {
      console.log(`🔍 [AI Manager] 获取Match ${matchId} 中的AI玩家...`);
      const apiServerUrl = process.env.API_SERVER_URL || 'http://api-server:8001';
      const internalServiceKey = process.env.INTERNAL_SERVICE_KEY || 'internal-service-secret-key-2024';
      
      const response = await fetch(`${apiServerUrl}/api/matches/${matchId}`, {
        headers: {
          'x-internal-service-key': internalServiceKey
        }
      });
      const result = await response.json();
      console.log(`📊 [AI Manager] API响应:`, { code: result.code, playersCount: result.data?.players?.length || 0 });
      
      if (result.code === 200 && result.data?.players) {
        const aiPlayers = result.data.players.filter(player => 
          player.playerType === 'ai' && player.status === 'joined'
        );
        console.log(`🤖 [AI Manager] 找到 ${aiPlayers.length} 个AI玩家需要连接`);
        return aiPlayers;
      }
      console.log(`⚠️ [AI Manager] 未找到有效的玩家数据`);
      return [];
    } catch (error) {
      console.error(`❌ [AI Manager] 获取Match ${matchId} 中的AI玩家失败:`, error);
      return [];
    }
  }

  /**
   * 让Match中的AI玩家加入游戏
   */
  async joinAIPlayersToMatch(match) {
    try {
      console.log(`🔄 [AI Manager] 处理Match: ${match.id}`);
      
      // 获取Match中的AI玩家
      const aiPlayers = await this.getAIPlayersInMatch(match.id);
      
      for (const aiPlayer of aiPlayers) {
        // 让AI玩家加入游戏
        await this.joinAIPlayerToMatch(aiPlayer, match.id, match.game_id);
      }
    } catch (error) {
      console.error(`处理Match ${match.id} 失败:`, error);
    }
  }



  async joinAIPlayerToMatch(aiPlayer, matchId, gameType) {
    console.log(`🎮 [AI Manager] 开始连接AI玩家到Match:`, {
      aiPlayerId: aiPlayer.id,
      playerName: aiPlayer.player_name,
      matchId,
      gameType
    });
    
    try {
      // 仅在提供或已有记录时使用gameType，不做默认fallback
      if (!gameType) {
        console.error(`❌ [AI Manager] 缺少gameType参数`);
        throw new Error('缺少gameType');
      }
 
      // 优先使用内存中的客户端
      let client = this.clients.get(aiPlayer.id);
      console.log(`🔍 [AI Manager] 检查内存中的客户端:`, {
        aiPlayerId: aiPlayer.id,
        hasExistingClient: !!client
      });
 
      if (!client) {
        // 如果内存中没有，创建新的连接实例
        const clientConfig = {
          id: aiPlayer.id,
          playerName: aiPlayer.player_name, // 使用 aiPlayer 的玩家名字
          gameType: gameType,
          matchId: matchId,
          gameServerUrl: process.env.GAME_SERVER_URL || 'http://game-server:8000'
        };
        
        console.log(`🆕 [AI Manager] 创建新的AI客户端:`, clientConfig);
        client = new AIPlayerConnection(clientConfig);
        this.clients.set(aiPlayer.id, client);
        console.log(`✅ [AI Manager] AI客户端已创建并存储到内存`);
      }
 
      // 如果内存客户端存在，连接到游戏服务器
      if (client && typeof client.connect === 'function') {
        console.log(`🔗 [AI Manager] 连接AI客户端到游戏服务器:`, {
          aiPlayerId: aiPlayer.id,
          matchId,
          gameType
        });
        client.matchId = matchId;
        client.gameType = gameType;
        await client.connect();
        console.log(`✅ [AI Manager] AI客户端已成功连接到Match: ${matchId}`);
      } else {
        console.warn(`⚠️ [AI Manager] 客户端不存在或缺少connect方法:`, {
          hasClient: !!client,
          hasConnectMethod: client && typeof client.connect === 'function'
        });
      }
 
      const result = {
        id: aiPlayer.id,
        matchId,
        gameType: gameType,
        status: 'assigned'
      };
      console.log(`🎯 [AI Manager] AI玩家连接完成:`, result);
      return result;
    } catch (error) {
      console.error(`❌ [AI Manager] 连接AI玩家到游戏失败:`, {
        aiPlayerId: aiPlayer.id,
        matchId,
        gameType,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  /**
   * 关闭AI Manager
   */
  async shutdown() {
    try {
      console.log('🔄 [AI Manager] 正在关闭...');
      
      // 断开所有AI玩家连接
      for (const [clientId, client] of this.clients.entries()) {
        if (typeof client.disconnect === 'function') {
          await client.disconnect();
        }
      }
      this.clients.clear();
      
      // 关闭PostgreSQL监听器
      if (this.pgListener) {
        await this.pgListener.close();
      }
      
      console.log('✅ [AI Manager] 已关闭');
    } catch (error) {
      console.error('❌ [AI Manager] 关闭时出错:', error);
    }
  }
}

module.exports = { AIPlayerSessionManager };
