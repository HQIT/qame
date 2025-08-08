const express = require('express');
const AIService = require('../services/aiService');

const router = express.Router();

// 获取AI类型列表（已废弃）
router.get('/types', async (req, res) => {
  return res.json({ code: 200, message: '功能已废弃', data: [] });
});

// 调用AI获取移动（已废弃）
router.post('/move', async (req, res) => {
  return res.status(400).json({ code: 400, message: '功能已废弃', data: null });
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