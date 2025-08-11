const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// 路由引入
const bgioRoutes = require('./routes/bgio');

// 中间件引入
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');

const app = express();

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// 静态文件服务（React build后的文件）
app.use(express.static(path.join(__dirname, '../build')));

// API路由 - 只保留boardgame.io数据库管理相关的API
app.use('/api/bgio', authMiddleware, adminMiddleware, bgioRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-console' });
});

// SPA路由处理 - 所有非API请求都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '内部服务器错误',
    data: null
  });
});

module.exports = app;
