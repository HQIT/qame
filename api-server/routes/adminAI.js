const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const AIProvider = require('../models/AIProvider');
const AIType = require('../models/AIType');

const router = express.Router();

// 所有Admin AI路由都需要先验证token，再验证Admin权限
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== AI提供商管理 ====================

// 获取AI提供商列表
router.get('/ai-providers', async (req, res) => {
  try {
    const providers = await AIProvider.findAll();
    
    res.json({
      code: 200,
      message: '获取AI提供商列表成功',
      data: providers
    });
  } catch (error) {
    console.error('获取AI提供商列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 创建AI提供商
router.post('/ai-providers', async (req, res) => {
  try {
    const { name, description, status = 'active' } = req.body;

    if (!name) {
      return res.status(400).json({
        code: 400,
        message: '提供商名称不能为空',
        data: null
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        code: 400,
        message: '提供商名称长度必须在2-100个字符之间',
        data: null
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态必须是active或inactive',
        data: null
      });
    }

    const newProvider = await AIProvider.create(name, description, status);

    res.json({
      code: 200,
      message: '创建AI提供商成功',
      data: newProvider
    });
  } catch (error) {
    console.error('创建AI提供商失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 更新AI提供商
router.put('/ai-providers/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({
        code: 400,
        message: '提供商名称不能为空',
        data: null
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        code: 400,
        message: '提供商名称长度必须在2-100个字符之间',
        data: null
      });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态必须是active或inactive',
        data: null
      });
    }

    const updates = { name, description };
    if (status) updates.status = status;

    const updatedProvider = await AIProvider.update(providerId, updates);

    res.json({
      code: 200,
      message: '更新AI提供商成功',
      data: updatedProvider
    });
  } catch (error) {
    console.error('更新AI提供商失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 删除AI提供商
router.delete('/ai-providers/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    
    const deletedProvider = await AIProvider.delete(providerId);

    res.json({
      code: 200,
      message: '删除AI提供商成功',
      data: deletedProvider
    });
  } catch (error) {
    console.error('删除AI提供商失败:', error);
    
    if (error.message.includes('该AI提供商下还有AI类型')) {
      res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
    } else {
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
});

// ==================== AI类型管理 ====================

// 获取AI类型列表
router.get('/ai-types', async (req, res) => {
  try {
    const types = await AIType.findAll();
    
    res.json({
      code: 200,
      message: '获取AI类型列表成功',
      data: types
    });
  } catch (error) {
    console.error('获取AI类型列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 创建AI类型
router.post('/ai-types', async (req, res) => {
  try {
    const { 
      provider_id, 
      name, 
      description, 
      endpoint, 
      config_schema = {}, 
      supported_games = [], 
      status = 'active' 
    } = req.body;

    if (!provider_id || !name || !endpoint) {
      return res.status(400).json({
        code: 400,
        message: '提供商ID、名称和端点不能为空',
        data: null
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        code: 400,
        message: 'AI类型名称长度必须在2-100个字符之间',
        data: null
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态必须是active或inactive',
        data: null
      });
    }

    // 验证提供商是否存在
    const provider = await AIProvider.findById(provider_id);
    if (!provider) {
      return res.status(404).json({
        code: 404,
        message: '指定的AI提供商不存在',
        data: null
      });
    }

    const newType = await AIType.create(
      provider_id, 
      name, 
      description, 
      endpoint, 
      config_schema, 
      supported_games, 
      status
    );

    res.json({
      code: 200,
      message: '创建AI类型成功',
      data: newType
    });
  } catch (error) {
    console.error('创建AI类型失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 更新AI类型
router.put('/ai-types/:id', async (req, res) => {
  try {
    const typeId = parseInt(req.params.id);
    const { 
      provider_id, 
      name, 
      description, 
      endpoint, 
      config_schema, 
      supported_games, 
      status 
    } = req.body;

    if (!name) {
      return res.status(400).json({
        code: 400,
        message: 'AI类型名称不能为空',
        data: null
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        code: 400,
        message: 'AI类型名称长度必须在2-100个字符之间',
        data: null
      });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态必须是active或inactive',
        data: null
      });
    }

    const updates = { name, description, endpoint };
    if (provider_id) updates.provider_id = provider_id;
    if (config_schema) updates.config_schema = config_schema;
    if (supported_games) updates.supported_games = supported_games;
    if (status) updates.status = status;

    const updatedType = await AIType.update(typeId, updates);

    res.json({
      code: 200,
      message: '更新AI类型成功',
      data: updatedType
    });
  } catch (error) {
    console.error('更新AI类型失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 删除AI类型
router.delete('/ai-types/:id', async (req, res) => {
  try {
    const typeId = parseInt(req.params.id);
    
    const deletedType = await AIType.delete(typeId);

    res.json({
      code: 200,
      message: '删除AI类型成功',
      data: deletedType
    });
  } catch (error) {
    console.error('删除AI类型失败:', error);
    
    if (error.message.includes('该AI类型正在被房间使用')) {
      res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
    } else {
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
});

module.exports = router; 