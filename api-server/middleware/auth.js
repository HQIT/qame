const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 生成JWT令牌
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 验证JWT令牌
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 认证中间件
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: '访问令牌缺失',
        message: '请先登录' 
      });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: '无效的访问令牌',
        message: '令牌已过期或无效，请重新登录' 
      });
    }
    
    // 验证用户是否仍然存在
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        error: '用户不存在',
        message: '用户已被删除，请重新登录' 
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({ 
      error: '认证服务错误',
      message: '服务器内部错误' 
    });
  }
}

// 可选认证中间件（不强制要求登录）
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    next(); // 继续执行，不阻止请求
  }
}

// 管理员认证中间件
async function authenticateAdmin(req, res, next) {
  try {
    // 先进行普通用户认证
    await authenticateToken(req, res, (err) => {
      if (err) return next(err);
      
      // 检查是否为管理员（这里可以根据需要扩展管理员逻辑）
      // 暂时使用简单的用户名检查
      const adminUsernames = ['admin', 'administrator'];
      if (!adminUsernames.includes(req.user.username)) {
        return res.status(403).json({ 
          error: '权限不足',
          message: '需要管理员权限' 
        });
      }
      
      next();
    });
  } catch (error) {
    console.error('管理员认证中间件错误:', error);
    return res.status(500).json({ 
      error: '认证服务错误',
      message: '服务器内部错误' 
    });
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  authenticateAdmin,
  JWT_SECRET,
  JWT_EXPIRES_IN
}; 