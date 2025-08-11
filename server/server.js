const { Server, Origins } = require('boardgame.io/server');
const Router = require('@koa/router');
const { TicTacToe, Gomoku } = require('@qame/games');



// 定义游戏列表，供多处使用
const GAMES_LIST = [TicTacToe, Gomoku];

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
  games: GAMES_LIST,
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

// 轻量自定义路由（健康检查 / 游戏列表）挂在 boardgame.io 的 Koa app
const router = new Router();

// 获取支持的游戏列表
router.get('/api/games', async (ctx) => {
  try {
    // 返回当前server支持的游戏列表
    const games = GAMES_LIST.map(game => {
      let displayName, id;
      switch (game.name) {
        case 'tic-tac-toe':
          displayName = '井字棋';
          id = 'tic-tac-toe';
          break;
        case 'gomoku':
          displayName = '五子棋';
          id = 'gomoku';
          break;
        default:
          displayName = game.name;
          id = game.name.toLowerCase();
      }
      return { id, name: displayName };
    });
    
    ctx.body = {
      code: 200,
      message: '获取成功',
      data: games
    };
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '获取游戏列表失败',
      data: null
    };
  }
});

server.app
  .use(router.routes())
  .use(router.allowedMethods());



// 启动服务器
server.run(8000, () => {
  console.log('🎮 Qame 游戏服务器运行在端口 8000 - 纯 boardgame.io 服务');
  console.log('🚀 服务器启动完成');
});