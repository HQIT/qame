const ticTacToeHandler = require('./ticTacToeHandler');

/**
 * 游戏处理器映射
 * 每个游戏都需要实现 getMove 方法
 */
module.exports = {
  'tic-tac-toe': ticTacToeHandler,
  // 可以添加更多游戏处理器
  // 'connect-four': connectFourHandler,
  // 'checkers': checkersHandler,
};
