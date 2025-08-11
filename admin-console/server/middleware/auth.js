const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // 从cookie中获取token - 改为access_token以匹配api-server
    const token = req.cookies.access_token;
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null
      });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '认证令牌已过期',
        data: null
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌',
        data: null
      });
    } else {
      return res.status(500).json({
        code: 500,
        message: '认证验证失败',
        data: null
      });
    }
  }
};

module.exports = authMiddleware;
