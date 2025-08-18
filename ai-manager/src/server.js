const express = require('express');
const cors = require('cors');
const { AIPlayerSessionManager } = require('./AIPlayerSessionManager.js');

const app = express();
const port = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());

// AI玩家会话管理器
const aiManager = new AIPlayerSessionManager();

// 启动服务器
app.listen(port, () => {
  console.log(`🤖 [AI Manager] AI管理服务运行在端口 ${port}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 [AI Manager] 收到退出信号，正在关闭服务...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [AI Manager] 收到终止信号，正在关闭服务...');
  process.exit(0);
});
