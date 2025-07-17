const { INVALID_MOVE } = require('boardgame.io/core');

const TicTacToe = {
  name: 'tic-tac-toe',
  
  setup: () => ({
    cells: Array(9).fill(null),
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
      console.log('=== 服务器端 MOVE 被调用 ===');
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
    console.log('服务器端检查游戏结束状态 - 参数:', { G: G, ctx: ctx });
    
    // 防护性检查
    if (!G || !ctx) {
      console.log('服务器端：G 或 ctx 为空，跳过结束检查');
      return;
    }
    
    if (!G.cells) {
      console.log('服务器端：G.cells 为空，跳过结束检查');
      return;
    }
    
    console.log('服务器端检查游戏结束状态:', { cells: G.cells, currentPlayer: ctx.currentPlayer });
    
    // 检查是否有玩家获胜
    if (IsVictory(G.cells)) {
      console.log('服务器端检测到获胜条件');
      // 找到获胜的玩家
      for (let player of ['0', '1']) {
        if (IsPlayerVictory(G.cells, player)) {
          console.log(`服务器端：玩家 ${player} 获胜!`);
          return { winner: player };
        }
      }
    }
    
    // 检查是否平局
    if (IsDraw(G.cells)) {
      console.log('服务器端：游戏平局!');
      return { draw: true };
    }
    
    console.log('服务器端：游戏继续进行');
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

module.exports = TicTacToe; 