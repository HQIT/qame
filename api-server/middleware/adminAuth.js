const User = require('../models/User');

// Admin权限验证中间件
const requireAdmin = async (req, res, next) => {
  try {
    // 首先验证token（复用现有的auth中间件）
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        code: 401,
        message: '需要管理员权限',
        data: null
      });
    }

    // 检查用户是否为Admin
    console.log('🔐 Admin权限检查:', { id: req.user.id, username: req.user.username, role: req.user.role });
    if (req.user.role !== 'admin') {
      console.log('❌ Admin权限不足:', req.user.role);
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限',
        data: null
      });
    }
    
    console.log('✅ Admin权限验证通过');

    // 将用户信息添加到请求对象
    req.adminUser = req.user;
    next();
  } catch (error) {
    console.error('Admin权限验证失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
};

module.exports = { requireAdmin }; 