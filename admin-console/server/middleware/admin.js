const adminMiddleware = (req, res, next) => {
  // 检查用户是否为管理员
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      code: 403,
      message: '权限不足，需要管理员权限',
      data: null
    });
  }
  
  next();
};

module.exports = adminMiddleware;
