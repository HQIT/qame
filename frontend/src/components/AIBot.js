import React, { useEffect } from 'react';

/**
 * AI Bot 组件
 * 用于自动进行井字棋游戏
 */
const AIBot = ({ G, ctx, moves, playerID, isActive, isAIPlayer }) => {
  
  // AI Bot 自动移动逻辑
  useEffect(() => {
    if (isAIPlayer && isActive && !ctx.gameover) {
      // 延迟一下，让玩家看到AI在"思考"
      const timer = setTimeout(() => {
        const bestMove = findBestMove(G.cells, playerID);
        if (bestMove !== -1) {
          moves.clickCell(bestMove);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAIPlayer, isActive, G.cells, playerID, moves, ctx.gameover]);

  // 如果当前玩家是AI，显示AI状态
  if (isAIPlayer && isActive && !ctx.gameover) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffeaa7',
        margin: '10px 0'
      }}>
        <div style={{ fontSize: '1.2rem', color: '#856404' }}>
          🤖 AI Bot 正在思考中...
        </div>
      </div>
    );
  }

  return null;
};

/**
 * 找到最佳移动
 * 使用简单的AI算法来选择最佳移动
 */
function findBestMove(cells, playerID) {
  // 1. 首先检查是否有获胜机会
  for (let i = 0; i < 9; i++) {
    if (cells[i] === null) {
      // 临时放置棋子
      const tempCells = [...cells];
      tempCells[i] = playerID;
      
      // 检查是否会获胜
      if (checkWin(tempCells, playerID)) {
        return i;
      }
    }
  }

  // 2. 检查对手是否有获胜机会，如果有则阻止
  const opponentID = playerID === '0' ? '1' : '0';
  for (let i = 0; i < 9; i++) {
    if (cells[i] === null) {
      const tempCells = [...cells];
      tempCells[i] = opponentID;
      
      if (checkWin(tempCells, opponentID)) {
        return i;
      }
    }
  }

  // 3. 优先选择中心位置
  if (cells[4] === null) {
    return 4;
  }

  // 4. 优先选择角落位置
  const corners = [0, 2, 6, 8];
  for (let corner of corners) {
    if (cells[corner] === null) {
      return corner;
    }
  }

  // 5. 选择任何可用的位置
  for (let i = 0; i < 9; i++) {
    if (cells[i] === null) {
      return i;
    }
  }

  return -1; // 没有可用移动
}

/**
 * 检查指定玩家是否获胜
 */
function checkWin(cells, player) {
  const positions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
    [0, 4, 8], [2, 4, 6] // 对角线
  ];

  for (let pos of positions) {
    const [a, b, c] = pos;
    if (cells[a] === player && cells[b] === player && cells[c] === player) {
      return true;
    }
  }
  return false;
}

export default AIBot; 