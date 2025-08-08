const express = require('express');
const router = express.Router();

// 获取AI管理器实例
function getAIManager(req) {
  return req.app.locals.aiManager;
}

// 响应格式化
function formatResponse(code, message, data = null) {
  return { code, message, data };
}

// ========== AI客户端管理 ==========

// 获取所有AI客户端
router.get('/clients', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const clients = await aiManager.getAllClients();
    res.json(formatResponse(200, '获取成功', clients));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// 获取单个AI客户端详情
router.get('/clients/:clientId', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const client = aiManager.getClient(req.params.clientId);
    
    if (!client) {
      return res.status(404).json(formatResponse(404, 'AI客户端不存在'));
    }
    
    res.json(formatResponse(200, '获取成功', client));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// 创建AI客户端
router.post('/clients', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const config = req.body;
    
    // 验证必要参数
    if (!config.playerName) {
      return res.status(400).json(formatResponse(400, '缺少玩家名称'));
    }
    
    const client = await aiManager.createClient(config);
    res.json(formatResponse(200, '创建成功', client));
  } catch (error) {
    res.status(500).json(formatResponse(500, '创建失败', error.message));
  }
});

// 停止AI客户端
router.delete('/clients/:clientId', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    await aiManager.stopClient(req.params.clientId);
    res.json(formatResponse(200, '停止成功'));
  } catch (error) {
    res.status(500).json(formatResponse(500, '停止失败', error.message));
  }
});

// 重新连接AI客户端
router.post('/clients/:clientId/reconnect', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const client = await aiManager.reconnectClient(req.params.clientId);
    res.json(formatResponse(200, '重新连接成功', client));
  } catch (error) {
    res.status(500).json(formatResponse(500, '重新连接失败', error.message));
  }
});

// 停止所有AI客户端
router.delete('/clients', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    await aiManager.stopAllClients();
    res.json(formatResponse(200, '全部停止成功'));
  } catch (error) {
    res.status(500).json(formatResponse(500, '全部停止失败', error.message));
  }
});

// 将AI客户端分配到指定match
router.post('/clients/:clientId/assign', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const { clientId } = req.params;
    const { matchId, gameType } = req.body;

    if (!matchId) {
      return res.status(400).json(formatResponse(400, '缺少matchId'));
    }

    const result = await aiManager.assignClientToMatch(clientId, matchId, gameType);
    res.json(formatResponse(200, '分配成功', result));
  } catch (error) {
    res.status(500).json(formatResponse(500, '分配失败', error.message));
  }
});

// ========== AI配置管理 (合并LLM配置+AI类型+AI提供商) ==========

// 获取所有AI配置
router.get('/ai-configs', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const configs = aiManager.getAIConfigs();
    res.json(formatResponse(200, '获取成功', configs));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// 获取单个AI配置
router.get('/ai-configs/:configId', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const config = aiManager.getAIConfig(req.params.configId);
    
    if (!config) {
      return res.status(404).json(formatResponse(404, 'AI配置不存在'));
    }
    
    res.json(formatResponse(200, '获取成功', config));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// 创建AI配置
router.post('/ai-configs', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const config = req.body;
    
    // 验证必要参数
    if (!config.name || !config.endpoint) {
      return res.status(400).json(formatResponse(400, '缺少必要参数：name和endpoint'));
    }
    
    if (!config.supportedGames || !Array.isArray(config.supportedGames) || config.supportedGames.length === 0) {
      return res.status(400).json(formatResponse(400, '必须指定至少一个支持的游戏'));
    }
    
    const configId = aiManager.addAIConfig(config);
    res.json(formatResponse(200, '创建成功', { id: configId }));
  } catch (error) {
    res.status(500).json(formatResponse(500, '创建失败', error.message));
  }
});

// 更新AI配置
router.put('/ai-configs/:configId', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const updatedConfig = aiManager.updateAIConfig(req.params.configId, req.body);
    res.json(formatResponse(200, '更新成功', updatedConfig));
  } catch (error) {
    res.status(500).json(formatResponse(500, '更新失败', error.message));
  }
});

// 删除AI配置
router.delete('/ai-configs/:configId', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const success = aiManager.deleteAIConfig(req.params.configId);
    
    if (success) {
      res.json(formatResponse(200, '删除成功'));
    } else {
      res.status(404).json(formatResponse(404, 'AI配置不存在'));
    }
  } catch (error) {
    res.status(500).json(formatResponse(500, '删除失败', error.message));
  }
});

// ========== 向后兼容的LLM配置API ==========

// 获取所有LLM配置 (兼容性API)
router.get('/llm-configs', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const configs = aiManager.getAIConfigs(); // 使用新的AI配置方法
    // 转换为旧格式
    const llmConfigs = configs.map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      systemPrompt: config.systemPrompt
    }));
    res.json(formatResponse(200, '获取成功', llmConfigs));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// 创建LLM配置 (兼容性API)
router.post('/llm-configs', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const config = req.body;
    
    // 验证必要参数
    if (!config.name || !config.endpoint) {
      return res.status(400).json(formatResponse(400, '缺少必要参数'));
    }
    
    // 转换为新的AI配置格式
    const aiConfig = {
      name: config.name,
      description: config.description || '通过LLM配置API创建',
      type: 'custom',
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 100,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || '你是一个聪明的游戏AI助手。',
      supportedGames: ['tic-tac-toe'], // 默认值
      maxComplexity: 'medium',
      maxPlayers: 4,
      maxBoardSize: 100,
      features: {
        strategicThinking: true,
        patternRecognition: true,
        longTermPlanning: false,
        realTimeDecision: true
      },
      minThinkTime: 1000,
      maxThinkTime: 3000,
      useFallback: true,
      validateMoves: true
    };
    
    const configId = aiManager.addAIConfig(aiConfig);
    res.json(formatResponse(200, '创建成功', { id: configId }));
  } catch (error) {
    res.status(500).json(formatResponse(500, '创建失败', error.message));
  }
});

// 更新LLM配置 (兼容性API)
router.put('/llm-configs/:configId', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    
    // 获取现有配置
    const existingConfig = aiManager.getAIConfig(req.params.configId);
    if (!existingConfig) {
      return res.status(404).json(formatResponse(404, 'LLM配置不存在'));
    }
    
    // 只更新LLM相关字段
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      endpoint: req.body.endpoint,
      apiKey: req.body.apiKey,
      model: req.body.model,
      maxTokens: req.body.maxTokens,
      temperature: req.body.temperature,
      systemPrompt: req.body.systemPrompt
    };
    
    const updatedConfig = aiManager.updateAIConfig(req.params.configId, updateData);
    res.json(formatResponse(200, '更新成功', updatedConfig));
  } catch (error) {
    res.status(500).json(formatResponse(500, '更新失败', error.message));
  }
});

// 删除LLM配置 (兼容性API)
router.delete('/llm-configs/:configId', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const success = aiManager.deleteAIConfig(req.params.configId);
    
    if (success) {
      res.json(formatResponse(200, '删除成功'));
    } else {
      res.status(404).json(formatResponse(404, 'LLM配置不存在'));
    }
  } catch (error) {
    res.status(500).json(formatResponse(500, '删除失败', error.message));
  }
});

// ========== AI类型管理 ==========

// 获取所有AI类型
router.get('/ai-types', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const types = aiManager.getAITypes();
    res.json(formatResponse(200, '获取成功', types));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// 创建AI类型
router.post('/ai-types', (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const aiType = req.body;
    
    // 验证必要参数
    if (!aiType.name || !aiType.supportedGames) {
      return res.status(400).json(formatResponse(400, '缺少必要参数'));
    }
    
    const typeId = aiManager.addAIType(aiType);
    res.json(formatResponse(200, '创建成功', { id: typeId }));
  } catch (error) {
    res.status(500).json(formatResponse(500, '创建失败', error.message));
  }
});

// ========== 统计信息 ==========

// 获取统计信息
router.get('/stats', async (req, res) => {
  try {
    const aiManager = getAIManager(req);
    const stats = await aiManager.getStats();
    res.json(formatResponse(200, '获取成功', stats));
  } catch (error) {
    res.status(500).json(formatResponse(500, '获取失败', error.message));
  }
});

// ========== 健康检查 ==========

// 健康检查
router.get('/health', (req, res) => {
  res.json(formatResponse(200, 'AI管理服务运行正常', {
    service: 'ai-manager',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));
});

module.exports = router;
