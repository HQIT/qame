/**
 * QAME Games - 内置游戏包
 * 统一的游戏逻辑，支持frontend、server、ai-manager
 */

const { TicTacToe } = require('./TicTacToe.js');
const { Gomoku } = require('./Gomoku.js');

module.exports = { TicTacToe, Gomoku };

// 游戏注册表
const GAMES_REGISTRY = {
  'tic-tac-toe': TicTacToe,
  'gomoku': Gomoku,
};

module.exports.GAMES_REGISTRY = GAMES_REGISTRY;

// 获取所有游戏列表
const getAllGames = () => Object.keys(GAMES_REGISTRY);

// 根据名称获取游戏
const getGame = (gameName) => {
  const game = GAMES_REGISTRY[gameName];
  if (!game) {
    throw new Error(`游戏 "${gameName}" 不存在`);
  }
  return game;
};

module.exports.getAllGames = getAllGames;
module.exports.getGame = getGame;
