const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空',
        data: null
      });
    }

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null
      });
    }

    // 验证密码
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取用户信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: '获取用户信息成功',
      data: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 验证token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: 'token验证成功',
      data: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('验证token错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 更新用户信息
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        code: 400,
        message: '用户名不能为空',
        data: null
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        code: 400,
        message: '用户名长度必须在3-20个字符之间',
        data: null
      });
    }

    // 检查新用户名是否已被其他用户使用
    const existingUser = await User.findByUsername(username);
    if (existingUser && existingUser.id !== req.user.userId) {
      return res.status(409).json({
        code: 409,
        message: '用户名已存在',
        data: null
      });
    }

    // 更新用户信息
    const updatedUser = await User.update(req.user.userId, { username });

    res.json({
      code: 200,
      message: '更新用户信息成功',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        createdAt: updatedUser.created_at
      }
    });

  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

module.exports = router; 