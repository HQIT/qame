const { INVALID_MOVE } = require('boardgame.io/core');

/**
 * 井字棋游戏逻辑 - QAME平台内置游戏
 */
const TicTacToe = {
  name: 'tic-tac-toe',
  
  setup: (ctx, setupData) => {
    console.log('🔥 [SETUP] TicTacToe游戏初始化');
    console.log('🔥 [SETUP] setupData:', setupData);
    
    return {
      cells: Array(9).fill(null),
      matchId: setupData?.matchId || null,
    };
  },

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  minPlayers: 2,
  maxPlayers: 2,

  moves: {
    clickCell({ G, playerID }, id) {
      if (G.cells[id] !== null) {
        console.log('❌ 无效移动：格子已被占用');
        return INVALID_MOVE;
      }
      
      G.cells[id] = playerID;
      console.log(`✅ 玩家 ${playerID} 在位置 ${id} 放置棋子`);
    },
    
    reportAIError({ G }, message) {
      G.aiError = typeof message === 'string' ? message : 'AI unavailable';
    },
  },

  endIf: ({ G, ctx }) => {
    if (!G || !ctx || !G.cells) {
      return;
    }
    
    const isEmptyBoard = G.cells.every(cell => cell === null);
    if (isEmptyBoard) {
      return;
    }
    
    for (let player of ['0', '1']) {
      const isWinner = IsPlayerVictory(G.cells, player);
      if (isWinner) {
        console.log(`🏆 服务器端：玩家 ${player} 获胜!`);
        return { winner: player };
      }
    }
    
    if (IsDraw(G.cells)) {
      console.log('🤝 服务器端：游戏平局!');
      return { draw: true };
    }
  },

  onEnd: ({ G, ctx }) => {
    console.log('🎮 游戏结束，最终状态:', { G, ctx });
    
    // 只在服务端环境执行
    if (typeof window === 'undefined' && typeof fetch !== 'undefined') {
      setImmediate(async () => {
        try {
          const matchId = G.matchId;
          if (matchId) {
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
    }
  },
};

/**
 * 检查指定玩家是否获胜
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
 */
function IsDraw(cells) {
  return cells.every(cell => cell !== null);
}

module.exports = { TicTacToe };
