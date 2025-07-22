const express = require('express');
const AIService = require('../services/aiService');

const router = express.Router();

// 获取AI类型列表
router.get('/types', async (req, res) => {
  try {
    const { gameId } = req.query;
    const aiTypes = await AIService.getAITypes(gameId);

    res.json({
      code: 200,
      message: '获取AI类型列表成功',
      data: aiTypes
    });

  } catch (error) {
    console.error('获取AI类型列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '获取AI类型列表失败',
      data: null
    });
  }
});

// 调用AI获取移动
router.post('/move', async (req, res) => {
  try {
    const { aiTypeId, gameState, config = {} } = req.body;

    if (!aiTypeId) {
      return res.status(400).json({
        code: 400,
        message: 'AI类型ID不能为空',
        data: null
      });
    }

    if (!gameState) {
      return res.status(400).json({
        code: 400,
        message: '游戏状态不能为空',
        data: null
      });
    }

    const result = await AIService.callAI(aiTypeId, gameState, config);

    if (result.success) {
      res.json({
        code: 200,
        message: 'AI调用成功',
        data: {
          move: result.move,
          aiType: result.aiType
        }
      });
    } else {
      res.status(500).json({
        code: 500,
        message: result.error || 'AI调用失败',
        data: null
      });
    }

  } catch (error) {
    console.error('AI调用错误:', error);
    res.status(500).json({
      code: 500,
      message: 'AI调用失败',
      data: null
    });
  }
});

// 测试AI提供商连接
router.post('/test', async (req, res) => {
  try {
    const { aiTypeId } = req.body;

    if (!aiTypeId) {
      return res.status(400).json({
        code: 400,
        message: 'AI类型ID不能为空',
        data: null
      });
    }

    const result = await AIService.testAIProvider(aiTypeId);

    if (result.success) {
      res.json({
        code: 200,
        message: 'AI提供商连接测试成功',
        data: {
          aiType: result.aiType,
          responseTime: result.responseTime
        }
      });
    } else {
      res.status(500).json({
        code: 500,
        message: result.error || 'AI提供商连接测试失败',
        data: null
      });
    }

  } catch (error) {
    console.error('AI提供商测试错误:', error);
    res.status(500).json({
      code: 500,
      message: 'AI提供商连接测试失败',
      data: null
    });
  }
});

module.exports = router; 