import { INVALID_MOVE } from 'boardgame.io/core';

/**
 * 井字棋游戏逻辑配置
 * 
 * ⚠️ 重要警告：按照官方示例的正确格式！
 * 参考：https://github.com/boardgameio/boardgame.io/blob/main/examples/react-native/game.js
 * 
 * 🔧 boardgame.io 框架的关键机制：
 * 1. moves 函数的参数格式：({ G, playerID }, id)
 * 2. 必须返回新的状态对象，不能直接修改 G
 * 3. 使用解构参数获取 playerID，不是 ctx.currentPlayer
 * 
 * ✅ 正确的实现（按照官方示例）：
 * - clickCell({ G, playerID }, id) { return { ...G, cells }; }
 */
const TicTacToe = {
  name: 'tic-tac-toe',
  setup: (ctx, setupData) => ({
    cells: Array(9).fill(null),
    // 从setupData获取配置
    aiConfig: setupData?.aiConfig || null,
    roomSettings: setupData?.roomSettings || null,
    // 游戏状态
    gameOver: false,
    winner: null
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  // 设置玩家数量
  minPlayers: 2,
  maxPlayers: 2,
    moves: {
    /**
     * 处理格子点击移动
     * 
     * ⚠️ 重要：按照官方示例的正确格式！
     * 参考：https://github.com/boardgameio/boardgame.io/blob/main/examples/react-native/game.js
     * 
     * @param {Object} { G, playerID } - 解构的游戏状态和玩家ID
     * @param {number} id - 格子索引
     */
    clickCell({ G, playerID }, id) {
      console.log('=== MOVE 被调用 ===');
      console.log('G:', G);
      console.log('playerID:', playerID);
      console.log('id:', id);
      
      // 防护性检查
      if (!G || !G.cells) {
        console.log('move 执行失败：G 或 G.cells 为空');
        return INVALID_MOVE;
      }
      
      if (typeof id !== 'number' || id < 0 || id >= 9) {
        console.log('move 执行失败：无效的 id');
        return INVALID_MOVE;
      }
      
      if (G.cells[id] !== null) {
        console.log('move 执行失败：该位置已被占用');
        return INVALID_MOVE;
      }
      
      // 创建新的状态对象（不可变更新）
      const cells = [...G.cells];
      cells[id] = playerID;
      
      console.log('move 执行成功');
      return { ...G, cells };
    },


  },
  
  endIf: ({ G, ctx }) => {
    // 防护性检查
    if (!G || !ctx || !G.cells) {
      return;
    }
    
    // 检查是否是空棋盘（重新开始后的状态）
    const isEmptyBoard = G.cells.every(cell => cell === null);
    if (isEmptyBoard) {
      return; // 游戏未结束
    }
    
    // 直接检查每个玩家是否获胜
    for (let player of ['0', '1']) {
      const isWinner = IsPlayerVictory(G.cells, player);
      if (isWinner) {
        console.log(`🏆 玩家 ${player} 获胜!`);
        return { winner: player };
      }
    }
    
    // 检查是否平局
    if (IsDraw(G.cells)) {
      console.log('🤝 游戏平局!');
      return { draw: true };
    }
  },

  // AI配置
  ai: {
    enumerate: (G, ctx) => {
      const moves = [];
      for (let i = 0; i < 9; i++) {
        if (G.cells[i] === null) {
          moves.push({ move: 'clickCell', args: [i] });
        }
      }
      return moves;
    },
  },
};

// 检查是否有玩家获胜
function IsVictory(cells) {
  // 防护性检查
  if (!cells || !Array.isArray(cells) || cells.length !== 9) {
    return false;
  }

  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
    [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
  ];

  for (let pos of positions) {
    if (!pos || !Array.isArray(pos) || pos.length !== 3) {
      continue;
    }
    const [a, b, c] = pos;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return true;
    }
  }
  return false;
}

// 检查特定玩家是否获胜
function IsPlayerVictory(cells, player) {
  // 防护性检查
  if (!cells || !Array.isArray(cells) || cells.length !== 9) {
    return false;
  }

  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
    [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
  ];

  for (let pos of positions) {
    if (!pos || !Array.isArray(pos) || pos.length !== 3) {
      continue;
    }
    const [a, b, c] = pos;
    if (cells[a] === player && cells[b] === player && cells[c] === player) {
      return true;
    }
  }
  return false;
}

// 检查是否平局
function IsDraw(cells) {
  // 防护性检查
  if (!cells || !Array.isArray(cells)) {
    return false;
  }
  return cells.filter(cell => cell === null).length === 0;
}

export default TicTacToe; 