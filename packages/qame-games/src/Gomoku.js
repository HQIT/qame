const { INVALID_MOVE } = require('boardgame.io/core');

/**
 * 五子棋游戏逻辑 - QAME平台内置游戏
 * 9x9棋盘，连续5子获胜
 */
const Gomoku = {
  name: 'gomoku',
  
  setup: (ctx, setupData) => {
    console.log('🔥 [SETUP] Gomoku五子棋游戏初始化');
    console.log('🔥 [SETUP] setupData:', setupData);
    
    return {
      cells: Array(81).fill(null), // 9x9 = 81个格子
      matchId: setupData?.matchId || null,
      lastMove: null,
    };
  },

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  minPlayers: 2,
  maxPlayers: 2,

  moves: {
    placeStone({ G, playerID }, position) {
      console.log('=== GOMOKU MOVE 被调用 ===');
      console.log('playerID:', playerID, 'position:', position);
      
      if (typeof position !== 'number' || position < 0 || position >= 81) {
        console.log('❌ 五子棋无效移动：位置超出范围');
        return INVALID_MOVE;
      }
      
      if (G.cells[position] !== null) {
        console.log('❌ 五子棋无效移动：格子已被占用');
        return INVALID_MOVE;
      }
      
      G.cells[position] = playerID;
      G.lastMove = position;
      
      const row = Math.floor(position / 9) + 1;
      const col = (position % 9) + 1;
      console.log(`✅ 玩家 ${playerID} 在第${row}行第${col}列放置棋子`);
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
      const isWinner = IsGomokuPlayerVictory(G.cells, player);
      if (isWinner) {
        console.log(`🏆 服务器端：玩家 ${player} 获胜!`);
        return { winner: player };
      }
    }
    
    if (IsGomokuDraw(G.cells)) {
      console.log('🤝 服务器端：五子棋平局!');
      return { draw: true };
    }
  },

  onEnd: ({ G, ctx }) => {
    console.log('🎮 五子棋游戏结束，最终状态:', { G, ctx });
    
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
                notes: ctx.gameover?.winner ? `玩家 ${ctx.gameover.winner} 获胜` : '五子棋平局'
              })
            });
            
            if (response.ok) {
              console.log('✅ [Gomoku] Match状态已更新为已完成');
            } else {
              console.error('❌ [Gomoku] 更新Match状态失败:', await response.text());
            }
          }
        } catch (error) {
          console.error('❌ [Gomoku] 更新Match状态时出错:', error.message);
        }
      });
    }
  },
};

/**
 * 五子棋获胜检测 - 检查是否有连续5个同色棋子
 */
function IsGomokuPlayerVictory(cells, player) {
  const BOARD_SIZE = 9;
  
  const getPosition = (index) => ({
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE
  });
  
  const getIndex = (row, col) => row * BOARD_SIZE + col;
  
  // 检查四个方向：水平、垂直、斜向右下、斜向左下
  const directions = [
    { dr: 0, dc: 1 },   // 水平
    { dr: 1, dc: 0 },   // 垂直
    { dr: 1, dc: 1 },   // 斜向右下
    { dr: 1, dc: -1 }   // 斜向左下
  ];
  
  for (let i = 0; i < 81; i++) {
    if (cells[i] !== player) continue;
    
    const { row, col } = getPosition(i);
    
    for (const { dr, dc } of directions) {
      let count = 1; // 当前位置算1个
      
      // 向正方向检查
      for (let step = 1; step < 5; step++) {
        const newRow = row + dr * step;
        const newCol = col + dc * step;
        
        if (newRow < 0 || newRow >= BOARD_SIZE || 
            newCol < 0 || newCol >= BOARD_SIZE) break;
        
        const newIndex = getIndex(newRow, newCol);
        if (cells[newIndex] === player) {
          count++;
        } else {
          break;
        }
      }
      
      // 向反方向检查
      for (let step = 1; step < 5; step++) {
        const newRow = row - dr * step;
        const newCol = col - dc * step;
        
        if (newRow < 0 || newRow >= BOARD_SIZE || 
            newCol < 0 || newCol >= BOARD_SIZE) break;
        
        const newIndex = getIndex(newRow, newCol);
        if (cells[newIndex] === player) {
          count++;
        } else {
          break;
        }
      }
      
      // 如果连续5个或更多，获胜
      if (count >= 5) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 检查是否平局（棋盘满了且没有获胜者）
 */
function IsGomokuDraw(cells) {
  return cells.every(cell => cell !== null);
}

module.exports = { Gomoku };
