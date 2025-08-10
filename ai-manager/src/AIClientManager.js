const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { SimpleAIClient } = require('./SimpleAIClient');
const AIClientModel = require('./models/AIClient');

class AIClientManager {
  constructor() {
    this.clients = new Map(); // clientId -> client info
    this.llmConfigs = new Map(); // configId -> LLM config (向后兼容)
    this.aiTypes = new Map(); // typeId -> AI type config (向后兼容)
    this.aiConfigs = new Map(); // configId -> AI config (新的统一配置)
    
    // 延迟启动自动重连，等待数据库连接就绪
    setTimeout(() => {
      this.autoReconnectClients();
    }, 2000);
  }



  /**
   * 自动重连所有断开的AI客户端
   */
  async autoReconnectClients() {
    try {
      console.log('🔄 [AI Manager] 启动自动重连服务...');
      
      // 获取所有数据库中的AI客户端
      const dbClients = await AIClientModel.getAll();
      
      if (dbClients.length === 0) {
        console.log('📝 [AI Manager] 没有需要重连的AI客户端');
        return;
      }

      console.log(`🔍 [AI Manager] 发现 ${dbClients.length} 个AI客户端，开始重连...`);
      
      let successCount = 0;
      let failCount = 0;

      // 批量重连所有AI客户端
      for (const dbClient of dbClients) {
        try {
          console.log(`🔄 [AI Manager] 重连AI客户端: ${dbClient.player_name} (${dbClient.id})`);
          
          // 重新创建配置
          const clientConfig = {
            id: dbClient.id,
            playerName: dbClient.player_name,
            gameType: dbClient.game_type,
            matchId: dbClient.match_id || 'lobby',
            playerID: dbClient.player_id?.toString() || '1', // 添加playerID配置
            credentials: dbClient.credentials || 'ai-credentials', // 添加credentials配置
            gameServerUrl: process.env.GAME_SERVER_URL || 'http://game-server:8000',
            aiConfig: dbClient.ai_config
          };

          // 创建新的AI客户端实例
          const aiClient = new SimpleAIClient(clientConfig);
          
          // 更新数据库状态为连接中
          await AIClientModel.updateStatus(dbClient.id, 'connecting');
          
          // 连接到游戏服务器
          await aiClient.connect();

          // 更新数据库状态为已连接
          await AIClientModel.updateStatus(dbClient.id, 'connected');

          // 存储客户端信息
          this.clients.set(dbClient.id, aiClient);
          
          successCount++;
          console.log(`✅ [AI Manager] AI客户端 ${dbClient.player_name} 重连成功`);

        } catch (error) {
          failCount++;
          console.error(`❌ [AI Manager] AI客户端 ${dbClient.player_name} 重连失败:`, error.message);
          
          // 更新数据库状态为错误
          try {
            await AIClientModel.updateStatus(dbClient.id, 'error');
          } catch (dbError) {
            console.warn(`⚠️ [AI Manager] 更新AI客户端错误状态失败:`, dbError.message);
          }
        }
      }

      console.log(`🎯 [AI Manager] 自动重连完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);

    } catch (error) {
      console.error('❌ [AI Manager] 自动重连服务失败:', error);
    }
  }

  /**
   * 创建AI客户端（新的简化版本）
   */
  async createClient(config) {
    const clientId = uuidv4();
    const { matchId, playerName, gameType, aiConfigId } = config;

    console.log(`🤖 [AI Manager] 创建AI客户端: ${clientId}`);

    try {
      // 获取AI配置（必须指定）
      if (!aiConfigId) {
        throw new Error('必须指定AI配置ID，不支持默认配置');
      }
      
      const aiConfig = this.getAIConfig(aiConfigId);
      if (!aiConfig) {
        throw new Error(`AI配置不存在: ${aiConfigId}`);
      }

      // 创建简化的AI客户端配置
      const clientConfig = {
        id: clientId,
        playerName: playerName || `AI-${clientId.slice(0, 8)}`,
        gameType: gameType || 'tic-tac-toe',
        matchId: matchId || 'lobby',
        gameServerUrl: process.env.GAME_SERVER_URL || 'http://game-server:8000',
        aiConfig: {
          endpoint: aiConfig.endpoint,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          maxTokens: aiConfig.maxTokens,
          temperature: aiConfig.temperature,
          systemPrompt: aiConfig.systemPrompt,
          timeout: 10000
        }
      };

      // 创建AI客户端实例
      const aiClient = new SimpleAIClient(clientConfig);
      
      // 先将客户端信息持久化到数据库
      try {
        await AIClientModel.create({
          id: clientId,
          player_name: clientConfig.playerName,
          game_type: clientConfig.gameType,
          status: 'created',
          match_id: clientConfig.matchId === 'lobby' ? null : clientConfig.matchId,
          ai_config: clientConfig.aiConfig
        });
        console.log(`💾 [AI Manager] AI客户端 ${clientId} 已持久化到数据库`);
      } catch (dbError) {
        console.warn(`⚠️ [AI Manager] AI客户端 ${clientId} 数据库持久化失败:`, dbError.message);
      }
      
      // 连接到游戏服务器
      await aiClient.connect();

      // 更新数据库状态为连接中
      try {
        await AIClientModel.updateStatus(clientId, 'connecting');
      } catch (dbError) {
        console.warn(`⚠️ [AI Manager] 更新AI客户端状态失败:`, dbError.message);
      }

      // 存储客户端信息
      this.clients.set(clientId, aiClient);

      console.log(`✅ [AI Manager] AI客户端 ${clientId} 已创建并连接`);
      return aiClient.getStatus();

    } catch (error) {
      console.error(`❌ [AI Manager] 创建AI客户端失败:`, error);
      throw error;
    }
  }

  /**
   * 停止AI客户端（新的简化版本）
   */
  async stopClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`AI客户端 ${clientId} 不存在`);
    }

    console.log(`🛑 [AI Manager] 停止AI客户端: ${clientId}`);
    
    try {
      // 断开AI客户端连接
      if (typeof client.disconnect === 'function') {
        client.disconnect();
      }
    } catch (error) {
      console.error(`Error stopping AI client ${clientId}:`, error);
    }

    // 更新数据库状态为已断开
    try {
      await AIClientModel.updateStatus(clientId, 'disconnected');
      console.log(`💾 [AI Manager] AI客户端 ${clientId} 状态已更新为断开`);
    } catch (dbError) {
      console.warn(`⚠️ [AI Manager] 更新AI客户端状态失败:`, dbError.message);
    }

    this.clients.delete(clientId);
    console.log(`✅ [AI Manager] AI客户端 ${clientId} 已停止`);
  }

  /**
   * 重新连接AI客户端
   */
  async reconnectClient(clientId) {
    try {
      // 从数据库获取AI客户端信息
      const dbClient = await AIClientModel.getById(clientId);
      if (!dbClient) {
        throw new Error(`AI客户端 ${clientId} 不存在`);
      }

      console.log(`🔄 [AI Manager] 重新连接AI客户端: ${clientId}`);

      // 重新创建配置
      const clientConfig = {
        id: clientId,
        playerName: dbClient.player_name,
        gameType: dbClient.game_type,
        matchId: dbClient.match_id || 'lobby',
        gameServerUrl: process.env.GAME_SERVER_URL || 'http://game-server:8000',
        aiConfig: dbClient.ai_config
      };

      // 创建新的AI客户端实例
      const aiClient = new SimpleAIClient(clientConfig);
      
      // 更新数据库状态为连接中
      await AIClientModel.updateStatus(clientId, 'connecting');
      
      // 连接到游戏服务器
      await aiClient.connect();

      // 更新数据库状态为已连接
      await AIClientModel.updateStatus(clientId, 'connected');

      // 存储客户端信息
      this.clients.set(clientId, aiClient);

      console.log(`✅ [AI Manager] AI客户端 ${clientId} 重新连接成功`);
      return aiClient.getStatus();

    } catch (error) {
      console.error(`❌ [AI Manager] 重新连接AI客户端失败:`, error);
      // 更新数据库状态为错误
      try {
        await AIClientModel.updateStatus(clientId, 'error');
      } catch (dbError) {
        console.warn(`⚠️ [AI Manager] 更新AI客户端错误状态失败:`, dbError.message);
      }
      throw error;
    }
  }

  /**
   * 获取所有客户端状态
   */
  async getAllClients() {
    try {
      // 从数据库获取所有AI客户端
      const dbClients = await AIClientModel.getAll();
      
      // 合并内存中的客户端状态
      const clients = dbClients.map(dbClient => {
        const memoryClient = this.clients.get(dbClient.id);
        
        if (memoryClient && typeof memoryClient.getStatus === 'function') {
          // 内存中有活跃的客户端，使用其实时状态
          const status = memoryClient.getStatus();
          return {
            ...status,
            // 确保数据库中的信息优先
            created_at: dbClient.created_at,
            updated_at: dbClient.updated_at,
            last_seen: dbClient.last_seen
          };
        } else {
          // 只有数据库记录，转换格式
          return {
            id: dbClient.id,
            matchId: dbClient.match_id,
            playerName: dbClient.player_name,
            gameType: dbClient.game_type,
            status: dbClient.status,
            playerId: dbClient.player_id,
            createdAt: dbClient.created_at,
            updatedAt: dbClient.updated_at,
            lastSeen: dbClient.last_seen,
            logCount: 0
          };
        }
      });
      
      return clients;
    } catch (error) {
      console.error('获取AI客户端列表失败:', error);
      // 降级到只返回内存中的客户端
      const clients = [];
      for (const [id, client] of this.clients) {
        if (typeof client.getStatus === 'function') {
          clients.push(client.getStatus());
        }
      }
      return clients;
    }
  }

  /**
   * 获取客户端详情
   */
  getClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;
    
    if (typeof client.getDetailedInfo === 'function') {
      return client.getDetailedInfo();
    } else {
      // 向后兼容旧格式
      return {
        ...client,
        process: undefined // 不返回进程对象
      };
    }
  }

  /**
   * 停止所有客户端
   */
  async stopAllClients() {
    console.log(`🛑 [AI Manager] 停止所有AI客户端...`);
    const stopPromises = [];
    
    for (const clientId of this.clients.keys()) {
      stopPromises.push(this.stopClient(clientId));
    }
    
    await Promise.all(stopPromises);
    console.log(`✅ [AI Manager] 所有AI客户端已停止`);
  }

  /**
   * LLM配置管理
   */
  addLLMConfig(config) {
    const configId = config.id || uuidv4();
    this.llmConfigs.set(configId, { ...config, id: configId });
    return configId;
  }

  getLLMConfigs() {
    return Array.from(this.llmConfigs.values());
  }

  updateLLMConfig(configId, updates) {
    const config = this.llmConfigs.get(configId);
    if (!config) throw new Error(`LLM配置 ${configId} 不存在`);
    
    this.llmConfigs.set(configId, { ...config, ...updates });
    return this.llmConfigs.get(configId);
  }

  deleteLLMConfig(configId) {
    return this.llmConfigs.delete(configId);
  }

  /**
   * AI类型管理
   */
  getAITypes() {
    return Array.from(this.aiTypes.values());
  }

  addAIType(aiType) {
    const typeId = aiType.id || uuidv4();
    this.aiTypes.set(typeId, { ...aiType, id: typeId });
    return typeId;
  }



  /**
   * 新的统一AI配置管理方法
   */
  getAIConfigs() {
    return Array.from(this.aiConfigs.values());
  }

  getAIConfig(configId) {
    return this.aiConfigs.get(configId);
  }

  addAIConfig(config) {
    const configId = config.id || uuidv4();
    const fullConfig = {
      id: configId,
      name: config.name,
      description: config.description || '',
      type: config.type || 'custom',
      
      // LLM配置
      endpoint: config.endpoint,
      apiKey: config.apiKey || '',
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 100,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || '你是一个聪明的游戏AI助手。',
      
      // 能力配置
      supportedGames: config.supportedGames || ['tic-tac-toe'],
      maxComplexity: config.maxComplexity || 'medium',
      maxPlayers: config.maxPlayers || 4,
      maxBoardSize: config.maxBoardSize || 100,
      features: {
        strategicThinking: config.features?.strategicThinking || false,
        patternRecognition: config.features?.patternRecognition || true,
        longTermPlanning: config.features?.longTermPlanning || false,
        realTimeDecision: config.features?.realTimeDecision || true
      },
      
      // 行为配置
      minThinkTime: config.minThinkTime || 1000,
      maxThinkTime: config.maxThinkTime || 3000,
      useFallback: config.useFallback !== false,
      validateMoves: config.validateMoves !== false,
      
      createdAt: new Date()
    };
    
    this.aiConfigs.set(configId, fullConfig);
    
    // 同时更新LLM配置以保持兼容性
    this.llmConfigs.set(configId, {
      id: configId,
      name: fullConfig.name,
      description: fullConfig.description,
      endpoint: fullConfig.endpoint,
      apiKey: fullConfig.apiKey,
      model: fullConfig.model,
      maxTokens: fullConfig.maxTokens,
      temperature: fullConfig.temperature,
      systemPrompt: fullConfig.systemPrompt
    });
    
    return configId;
  }

  updateAIConfig(configId, updates) {
    const config = this.aiConfigs.get(configId);
    if (!config) {
      throw new Error(`AI配置 ${configId} 不存在`);
    }
    
    const updatedConfig = { ...config, ...updates, id: configId };
    this.aiConfigs.set(configId, updatedConfig);
    
    // 同时更新LLM配置以保持兼容性
    if (this.llmConfigs.has(configId)) {
      this.llmConfigs.set(configId, {
        id: configId,
        name: updatedConfig.name,
        description: updatedConfig.description,
        endpoint: updatedConfig.endpoint,
        apiKey: updatedConfig.apiKey,
        model: updatedConfig.model,
        maxTokens: updatedConfig.maxTokens,
        temperature: updatedConfig.temperature,
        systemPrompt: updatedConfig.systemPrompt
      });
    }
    
    return updatedConfig;
  }

  deleteAIConfig(configId) {
    const deleted = this.aiConfigs.delete(configId);
    // 同时删除LLM配置以保持兼容性
    this.llmConfigs.delete(configId);
    
    return deleted;
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const clients = await this.getAllClients();
    const statusCounts = {};
    
    clients.forEach(client => {
      statusCounts[client.status] = (statusCounts[client.status] || 0) + 1;
    });

    return {
      totalClients: clients.length,
      statusCounts,
      aiConfigCount: this.aiConfigs.size, // 新的统计
      llmConfigCount: this.llmConfigs.size, // 向后兼容
      aiTypeCount: this.aiTypes.size
    };
  }

  /**
   * 将AI客户端分配到指定match
   */
  async assignClientToMatch(clientId, matchId, gameType) {
    try {
      // 获取数据库中的客户端
      const dbClient = await AIClientModel.getById(clientId);
      if (!dbClient) {
        throw new Error(`AI客户端 ${clientId} 不存在`);
      }
 
      // 仅在提供或已有记录时使用gameType，不做默认fallback
      const targetGameType = gameType || dbClient.game_type;
      if (!targetGameType) {
        throw new Error('缺少gameType，且客户端记录中也无game_type');
      }
 
      // 优先使用内存中的客户端
      let client = this.clients.get(clientId);
 
      if (!client) {
        // 如果内存中没有，尝试重连并创建内存实例
        await this.reconnectClient(clientId);
        client = this.clients.get(clientId);
      }
 
      // 更新数据库中的match_id
      await AIClientModel.updateStatus(clientId, dbClient.status || 'connected', { match_id: matchId, last_seen: new Date() });
 
      // 如果内存客户端存在，指示其加入match
      if (client && typeof client.joinMatch === 'function') {
        client.matchId = matchId;
        client.gameType = targetGameType;
        await client.joinMatch(matchId);
      }
 
      return {
        id: clientId,
        matchId,
        gameType: targetGameType,
        status: 'assigned'
      };
    } catch (error) {
      console.error(`❌ [AI Manager] 分配AI客户端到match失败:`, error.message);
      throw error;
    }
  }
}

module.exports = { AIClientManager };
