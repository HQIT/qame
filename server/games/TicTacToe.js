const { INVALID_MOVE } = require('boardgame.io/core');

const TicTacToe = {
  name: 'tic-tac-toe',
  
  // 游戏初始化
  setup: (ctx, setupData) => {
    console.log('🔥 [SETUP] TicTacToe游戏初始化');
    console.log('🔥 [SETUP] setupData:', setupData);
    
    return {
      cells: [null, null, null, null, null, null, null, null, null], // 明确使用null值
      matchId: setupData?.matchId || null, // Match ID - 保留用于日志
    };
  },

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
      console.log('playerID:', playerID, 'type:', typeof playerID);
      console.log('id:', id);
      
      // 验证移动的有效性
      if (G.cells[id] !== null) {
        console.log('❌ 无效移动：格子已被占用');
        return INVALID_MOVE;
      }
      
      // 执行移动
      G.cells[id] = playerID;
      console.log(`✅ 玩家 ${playerID} 在位置 ${id} 放置棋子`);
      console.log('更新后的棋盘:', G.cells);
    },
    
    /**
     * 重新开始游戏
     * 允许在游戏结束后执行
     */
    restartGame: {
      move: ({ G, ctx, events }) => {
        console.log('服务器端：重新开始游戏');
        
        // 重置游戏状态
        G.cells = Array(9).fill(null);
        
        // 重置任何错误状态
        if (G.aiError) {
          delete G.aiError;
        }
        
        console.log('游戏已重新开始，棋盘状态:', G.cells);
      },
      // 允许在游戏结束后执行此移动
      ignoreStaleStateID: true,
    },
    
    /**
     * 记录AI错误（由AI管理器调用）
     */
    reportAIError({ G }, message) {
      G.aiError = typeof message === 'string' ? message : 'AI unavailable';
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
    
    // 检查是否是空棋盘（重新开始后的状态）
    const isEmptyBoard = G.cells.every(cell => cell === null);
    if (isEmptyBoard) {
      console.log('服务器端：空棋盘，游戏未结束');
      return; // 游戏未结束
    }
    
    console.log('服务器端检查游戏结束状态:', { cells: G.cells, currentPlayer: ctx.currentPlayer });
    
    // 直接检查每个玩家是否获胜（更可靠的方法）
    for (let player of ['0', '1']) {
      console.log(`检查玩家 ${player} 是否获胜，类型: ${typeof player}`);
      console.log('棋盘状态:', G.cells);
      console.log('棋盘元素类型:', G.cells.map(cell => typeof cell));
      
      const isWinner = IsPlayerVictory(G.cells, player);
      console.log(`玩家 ${player} 获胜检查结果: ${isWinner}`);
      
      if (isWinner) {
        console.log(`服务器端：玩家 ${player} 获胜!`);
        console.log('获胜时的棋盘状态:', G.cells);
        return { winner: player };
      }
    }
    
    // 检查是否平局
    if (IsDraw(G.cells)) {
      console.log('服务器端：游戏平局!');
      console.log('平局时的棋盘状态:', G.cells);
      return { draw: true };
    }
    
    console.log('服务器端：游戏继续进行');
  },

  onEnd: ({ G, ctx }) => {
    console.log('🎮 游戏结束，最终状态:', { G, ctx });
  },
};

/**
 * 检查是否有玩家获胜
 * @param {Array} cells - 棋盘状态
 * @returns {boolean} 是否有玩家获胜
 */
function IsVictory(cells) {
  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
    [0, 4, 8], [2, 4, 6] // 对角线
  ];

  const isRowComplete = row => {
    const symbols = row.map(i => cells[i]);
    return symbols.every(s => s !== null && s === symbols[0]);
  };

  return positions.map(isRowComplete).some(i => i === true);
}

/**
 * 检查指定玩家是否获胜
 * @param {Array} cells - 棋盘状态
 * @param {string} player - 玩家ID
 * @returns {boolean} 该玩家是否获胜
 */
function IsPlayerVictory(cells, player) {
  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
    [0, 4, 8], [2, 4, 6] // 对角线
  ];

  return positions.some(row => {
    return row.every(index => cells[index] === player);
  });
}

/**
 * 检查是否平局
 * @param {Array} cells - 棋盘状态
 * @returns {boolean} 是否平局
 */
function IsDraw(cells) {
  return cells.every(cell => cell !== null);
}

module.exports = TicTacToe; 