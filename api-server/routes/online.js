const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const OnlineUser = require('../models/OnlineUser');

const router = express.Router();

// 用户上线心跳接口
router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    console.log('💓 [心跳] 用户ID:', userId, '用户信息:', req.user);
    
    if (!userId) {
      return res.status(400).json({
        code: 400,
        message: '用户ID缺失',
        data: null
      });
    }
    
    // 更新心跳时间到数据库
    const onlineStatus = await OnlineUser.updateHeartbeat(userId);
    
    // 获取当前在线统计
    const stats = await OnlineUser.getStats();

    res.json({
      code: 200,
      message: '心跳更新成功',
      data: {
        status: 'online',
        onlineCount: parseInt(stats.total)
      }
    });

  } catch (error) {
    console.error('心跳更新失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取在线用户列表
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // 从数据库获取在线用户列表
    const onlineUsers = await OnlineUser.getOnlineUsers();
    const stats = await OnlineUser.getStats();

    res.json({
      code: 200,
      message: '获取在线用户成功',
      data: {
        users: onlineUsers,
        total: parseInt(stats.total),
        stats: {
          idle: parseInt(stats.idle),
          playing: parseInt(stats.playing),
          human: parseInt(stats.human_total || stats.total),
          ai: parseInt(stats.ai_total || 0)
        }
      }
    });

  } catch (error) {
    console.error('获取在线用户失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 用户主动下线
router.post('/offline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    await OnlineUser.setOffline(userId);
    
    const stats = await OnlineUser.getStats();

    res.json({
      code: 200,
      message: '下线成功',
      data: {
        onlineCount: parseInt(stats.total)
      }
    });

  } catch (error) {
    console.error('下线失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取在线统计信息
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await OnlineUser.getStats();

    res.json({
      code: 200,
      message: '获取统计信息成功',
      data: {
        total: parseInt(stats.total),
        idle: parseInt(stats.idle),
        playing: parseInt(stats.playing),
        admin: parseInt(stats.admin),
        human: parseInt(stats.human_total || stats.total),
        ai: parseInt(stats.ai_total || 0)
      }
    });

  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

module.exports = router;
