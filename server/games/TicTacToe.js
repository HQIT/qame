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
      // 验证移动的有效性
      if (G.cells[id] !== null) {
        console.log('❌ 无效移动：格子已被占用');
        return INVALID_MOVE;
      }
      
      // 执行移动
      G.cells[id] = playerID;
      console.log(`✅ 玩家 ${playerID} 在位置 ${id} 放置棋子`);
    },
    

    
    /**
     * 记录AI错误（由AI管理器调用）
     */
    reportAIError({ G }, message) {
      G.aiError = typeof message === 'string' ? message : 'AI unavailable';
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
    
    // 检查每个玩家是否获胜
    for (let player of ['0', '1']) {
      const isWinner = IsPlayerVictory(G.cells, player);
      if (isWinner) {
        console.log(`🏆 服务器端：玩家 ${player} 获胜!`);
        return { winner: player };
      }
    }
    
    // 检查是否平局
    if (IsDraw(G.cells)) {
      console.log('🤝 服务器端：游戏平局!');
      return { draw: true };
    }
  },

  onEnd: ({ G, ctx }) => {
    console.log('🎮 游戏结束，最终状态:', { G, ctx });
    
    // 异步更新数据库中的match状态
    setImmediate(async () => {
      try {
        const matchId = G.matchId;
        if (matchId) {
          // 调用API更新match状态为已完成
          const response = await fetch(`${process.env.API_SERVER_URL || 'http://api-server:3001'}/api/matches/${matchId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'finished',
              notes: ctx.gameover?.winner ? `玩家 ${ctx.gameover.winner} 获胜` : '游戏平局'
            })
          });
          
          if (response.ok) {
            console.log('✅ [Game] Match状态已更新为已完成');
          } else {
            console.error('❌ [Game] 更新Match状态失败:', await response.text());
          }
        }
      } catch (error) {
        console.error('❌ [Game] 更新Match状态时出错:', error.message);
      }
    });
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