import React from 'react';

/**
 * 井字棋游戏界面组件
 * 
 * ⚠️ 重要说明：此文件经过精心调试，任何修改都必须经过充分测试！
 * 如果其他AI想要修改，请先理解boardgame.io的完整工作流程。
 * 
 * 🔧 boardgame.io 组件机制：
 * 1. moves 对象包含所有可用的移动函数
 * 2. 调用 moves.clickCell(id) 时，boardgame.io 会自动将 id 作为数组传递给游戏逻辑
 * 3. 游戏逻辑中的函数必须接收 ...args 参数来获取传递的值
 * 
 * @param {Object} G - 游戏状态对象
 * @param {Object} ctx - 游戏上下文对象
 * @param {Object} moves - 可用的移动函数
 * @param {string} playerID - 当前玩家ID
 * @param {boolean} isActive - 当前玩家是否处于活动状态
 */
const TicTacToeBoard = ({ G, ctx, moves, playerID, isActive }) => {
  // 详细调试输出
  console.log('[Board] 渲染', { playerID, isActive, ctxCurrentPlayer: ctx.currentPlayer, G });

  /**
   * 处理格子点击事件
   * 
   * ⚠️ 注意：moves.clickCell 的参数传递方式非常重要！
   * 
   * 🔧 boardgame.io 调用机制：
   * 1. 这里调用 moves.clickCell(id) 时，boardgame.io 会直接传递 id 参数
   * 2. 游戏逻辑中的函数会直接接收到 id 参数
   * 3. 所以这里直接传递 id 是正确的，不要改为 moves.clickCell([id])
   * 
   * 🚫 错误的调用方式：
   * - moves.clickCell([id])  // 错误！会导致参数传递问题
   * 
   * ✅ 正确的调用方式：
   * - moves.clickCell(id)    // 正确！boardgame.io 会直接传递
   * 
   * @param {number} id - 被点击的格子索引 (0-8)
   */
  const onClick = (id) => {
    if (
      typeof id === 'number' &&
      id >= 0 &&
      id < 9 &&
      isActive &&
      playerID !== null &&
      G.cells &&
      G.cells[id] === null
    ) {
      // 🔧 重要：直接传递参数，让 boardgame.io 自己处理
      // 经过测试，这是正确的调用方式
      moves.clickCell(id);
    }
  };

  const getPlayerSymbol = (player) => {
    return player === '0' ? 'X' : 'O';
  };

  const getPlayerColor = (player) => {
    return player === '0' ? '#2196F3' : '#F44336';
  };

  let gameStatus = '';
  console.log('游戏状态检查:', { 
    gameover: ctx.gameover, 
    cells: G.cells,
    currentPlayer: ctx.currentPlayer 
  });
  
  if (ctx.gameover) {
    if (ctx.gameover.winner) {
      gameStatus = <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#4CAF50', margin: '1rem 0' }}>
        🎉 玩家 {getPlayerSymbol(ctx.gameover.winner)} 获胜！
      </div>;
    } else if (ctx.gameover.draw) {
      gameStatus = <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#FF9800', margin: '1rem 0' }}>
        🤝 游戏平局！
      </div>;
    }
  } else {
    gameStatus = (
      <div style={{ textAlign: 'center', fontSize: '1.2rem', margin: '2rem 0' }}>
        当前玩家: <span style={{ color: getPlayerColor(ctx.currentPlayer) }}>
          {getPlayerSymbol(ctx.currentPlayer)}
        </span>
      </div>
    );
  }

  return (
    <div>
      {gameStatus}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '5px',
        maxWidth: '300px',
        margin: '0 auto'
      }}>
        {G.cells.map((cell, id) => (
          <button
            key={id}
            onClick={() => onClick(id)}
            disabled={!isActive || cell !== null || ctx.gameover}
            style={{
              width: '100px',
              height: '100px',
              background: 'white',
              border: '2px solid #333',
              borderRadius: '10px',
              fontSize: '2rem',
              fontWeight: 'bold',
              cursor: isActive && cell === null && !ctx.gameover ? 'pointer' : 'not-allowed',
              color: cell ? getPlayerColor(cell) : '#333',
              opacity: isActive && cell === null && !ctx.gameover ? 1 : 0.8
            }}
          >
            {cell ? getPlayerSymbol(cell) : ''}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TicTacToeBoard; 