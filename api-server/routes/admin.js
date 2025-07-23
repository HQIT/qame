const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const User = require('../models/User');

const router = express.Router();

// 所有Admin路由都需要先验证token，再验证Admin权限
router.use(authenticateToken);
router.use(requireAdmin);

// 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const users = await User.findAll(page, limit);
    
    res.json({
      code: 200,
      message: '获取用户列表成功',
      data: {
        users,
        page,
        limit
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 更新用户信息
router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, role } = req.body;

    if (!username) {
      return res.status(400).json({
        code: 400,
        message: '用户名不能为空',
        data: null
      });
    }

    // 检查新用户名是否已被其他用户使用
    const existingUser = await User.findByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({
        code: 409,
        message: '用户名已存在',
        data: null
      });
    }

    // 更新用户信息
    const updates = { username };
    if (role && ['user', 'admin'].includes(role)) {
      updates.role = role;
    }

    const updatedUser = await User.update(userId, updates);

    res.json({
      code: 200,
      message: '更新用户信息成功',
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 删除用户
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // 不能删除自己
    if (userId === req.adminUser.id) {
      return res.status(400).json({
        code: 400,
        message: '不能删除自己的账户',
        data: null
      });
    }

    const deletedUser = await User.delete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: '删除用户成功',
      data: { id: deletedUser.id }
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取系统统计信息
router.get('/stats', async (req, res) => {
  try {
    // 获取用户统计
    const userStats = await User.getStats();
    
    // 获取房间统计（暂时返回模拟数据）
    const roomStats = {
      total: 0,
      active: 0,
      waiting: 0
    };
    
    // 获取在线用户统计（暂时返回模拟数据）
    const onlineStats = {
      total: 0,
      users: []
    };

    res.json({
      code: 200,
      message: '获取系统统计成功',
      data: {
        users: userStats,
        rooms: roomStats,
        online: onlineStats
      }
    });
  } catch (error) {
    console.error('获取系统统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

module.exports = router; 