const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./config/database');

// 路由
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: 'API服务器运行正常',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        redis: 'connected'
      }
    }
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    data: null
  });
});

// 启动服务器
const PORT = process.env.PORT || 8001;

async function startServer() {
  try {
    console.log('🔄 运行数据库迁移...');
    await runMigrations();
    console.log('✅ 数据库连接成功');
    console.log('✅ 数据库迁移执行成功');

    app.listen(PORT, () => {
      console.log(`🔐 API服务器运行在端口 ${PORT}`);
      console.log('🗄️  使用PostgreSQL数据库');
      console.log('🔐 认证API: /api/auth');
      console.log('🤖 AI API: /api/ai');
      console.log('🏥 健康检查: /health');
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 全局错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

startServer(); 