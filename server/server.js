const { Server, Origins } = require('boardgame.io/server');
const TicTacToe = require('./games/TicTacToe');

// 添加全局错误处理
process.on('uncaughtException', (err) => {
  console.log('全局错误:', err.message);
  console.log('错误堆栈:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('未处理的 Promise 拒绝:', reason);
});

// 创建boardgame.io服务器
const server = Server({
  games: [TicTacToe],
  origins: [
    // 允许本地开发环境连接
    Origins.LOCALHOST_IN_DEVELOPMENT,
    // 允许前端应用连接
    'http://localhost:3000',
    'http://localhost:80',
    'http://192.168.1.156:3000',
    'http://192.168.1.156:80'
  ],
});

// 启动服务器
server.run(8000, () => {
  console.log('🎮 Boardgame.io 服务器运行在端口 8000');
}); 