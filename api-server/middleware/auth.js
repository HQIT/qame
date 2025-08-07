const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 内部服务认证密钥
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'internal-service-secret-key-2024';

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
    // 检查是否是内部服务请求
    const internalServiceKey = req.headers['x-internal-service-key'];
    if (internalServiceKey === INTERNAL_SERVICE_KEY) {
      console.log('🔧 内部服务认证通过');
      // 创建一个虚拟的系统用户
      req.user = {
        id: 0,
        username: 'system',
        role: 'system'
      };
      return next();
    }

    // 优先从Authorization header获取token，其次从Cookie获取
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1]; // Bearer TOKEN
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    
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
    
    console.log('🔍 Token解码结果:', decoded);
    
    // 验证用户是否仍然存在
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: '用户不存在',
        message: '用户已被删除，请重新登录' 
      });
    }
    
    console.log('👤 找到用户:', { id: user.id, username: user.username, role: user.role });
    
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
      
      // 检查是否为管理员（检查role字段）
      console.log('🔐 管理员权限检查:', { username: req.user.username, role: req.user.role });
      if (req.user.role !== 'admin') {
        console.log('❌ 权限不足:', req.user.role);
        return res.status(403).json({ 
          error: '权限不足',
          message: '需要管理员权限' 
        });
      }
      
      console.log('✅ 管理员权限验证通过');
      
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
  JWT_EXPIRES_IN,
  INTERNAL_SERVICE_KEY
}; 