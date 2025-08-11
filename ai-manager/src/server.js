const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { AIClientManager } = require('./AIClientManager.js');

const app = express();
const port = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// AI客户端管理器
const aiManager = new AIClientManager();

// 根路径返回管理界面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API路由
const apiRoutes = require('./routes/api.js');
app.use('/api', apiRoutes);

// 将AI管理器传递给路由
app.locals.aiManager = aiManager;

// 启动服务器
app.listen(port, () => {
  console.log(`🤖 [AI Manager] AI管理服务运行在端口 ${port}`);
  console.log(`🌐 [AI Manager] 管理界面: http://localhost:${port}`);
  console.log(`📡 [AI Manager] API接口: http://localhost:${port}/api`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 [AI Manager] 收到退出信号，正在关闭所有AI客户端...');
  await aiManager.stopAllClients();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [AI Manager] 收到终止信号，正在关闭所有AI客户端...');
  await aiManager.stopAllClients();
  process.exit(0);
});
