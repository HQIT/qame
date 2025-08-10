import React, { useEffect, useState } from 'react';

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
 * @param {boolean} enableAI - 是否启用AI Bot（兼容旧版本）
 * @param {string} aiType - AI类型（兼容旧版本）
 * @param {Object} setupData - 设置数据（新版本）
 */
const TicTacToeBoard = ({ G, ctx, moves, playerID, isActive, enableAI = false, aiType = 'none', setupData, matchInfo }) => {
  // 渲染调试信息（仅在开发模式显示）
  if (process.env.NODE_ENV === 'development') {
    console.log('[Board] 渲染', { 
      playerID, 
      currentPlayer: ctx.currentPlayer, 
      gameover: ctx.gameover
    });
  }

  // 基于游戏状态或matchInfo判断当前玩家是否为AI（G.aiPlayers 为空时兜底）
  let isAIPlayer = false;
  let currentAiType = 'none';
  const numericPlayerId = parseInt(playerID);
  if (G.aiPlayers && Array.isArray(G.aiPlayers)) {
    isAIPlayer = G.aiPlayers.some(ai => ai.seat_index === numericPlayerId);
    if (isAIPlayer) {
      currentAiType = G.aiPlayers.find(ai => ai.seat_index === numericPlayerId)?.ai_type_name || 'traditional';
    }
  } else if (matchInfo && Array.isArray(matchInfo.players)) {
    const me = matchInfo.players.find(p => p.seatIndex === numericPlayerId);
    if (me && me.isAI) {
      isAIPlayer = true;
      currentAiType = 'traditional';
    }
  }
  // 以回合为准，避免 isActive 异常导致无法行动
  const isMyTurn = playerID != null && playerID.toString() === ctx.currentPlayer && !ctx.gameover;
  const isCurrentPlayerAI = isAIPlayer && isMyTurn;
  
  // AI配置调试信息（仅在开发模式显示）
  if (process.env.NODE_ENV === 'development' && isAIPlayer) {
    console.log('[Board] AI配置:', { playerID, currentAiType });
  }
  
  // 前端不执行AI逻辑，只被动接收状态变化
  // AI逻辑完全由后端AI Manager处理
  
  // 根据AI类型选择对应的Bot组件
  const getBotComponent = () => {
    console.log('�� 选择Bot组件:', {
      isAIPlayer,
      currentAiType,
      shouldShowBot: isAIPlayer
    });
    
    if (!isAIPlayer) {
      console.log('🎮 不显示Bot组件');
      return null;
    }
    
    // AI逻辑已移至服务端ai-manager处理，客户端仅显示AI状态
    if (isMyTurn && !ctx.gameover) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '8px',
          margin: '10px 0'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '5px' }}>🤖</div>
          <div style={{ color: '#1976d2', fontWeight: 'bold' }}>AI正在思考中...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            由服务端AI处理 ({currentAiType})
          </div>
        </div>
      );
    }
    
    return null;
  };

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
      isMyTurn &&
      playerID !== null &&
      G.cells &&
      G.cells[id] === null &&
      !isAIPlayer // 只有人类玩家才能点击
    ) {
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
    const currentPlayerSymbol = getPlayerSymbol(ctx.currentPlayer);
    
    // 根据AI类型显示不同的标签
    const getAILabel = () => {
      if (!isCurrentPlayerAI) return null;
      
      switch (currentAiType) {
        case 'traditional':
          return <span style={{ marginLeft: '10px', fontSize: '1rem', color: '#FF9800' }}>
            🤖 (传统AI)
          </span>;
        case 'llm':
          return <span style={{ marginLeft: '10px', fontSize: '1rem', color: '#9C27B0' }}>
            🧠 (LLM Bot)
          </span>;
        default:
          return <span style={{ marginLeft: '10px', fontSize: '1rem', color: '#FF9800' }}>
            🤖 (AI Bot)
          </span>;
      }
    };
    
    gameStatus = (
      <div style={{ textAlign: 'center', fontSize: '1.2rem', margin: '2rem 0' }}>
        当前玩家: <span style={{ color: getPlayerColor(ctx.currentPlayer) }}>
          {currentPlayerSymbol}
        </span>
        {getAILabel()}
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      {/* 游戏状态显示 */}
      <div style={{ marginBottom: '20px' }}>
        {ctx.gameover ? (
          <div>
            <h2 style={{ color: '#4caf50' }}>
              {ctx.gameover.winner ? `玩家 ${ctx.gameover.winner} 获胜！` : '游戏平局！'}
            </h2>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
              🎉 游戏结束！可使用上方"返回游戏大厅"按钮回到大厅
            </p>
          </div>
        ) : (
          <div>
            <h3>当前玩家: {ctx.currentPlayer}</h3>
            {isCurrentPlayerAI && (
              <div style={{ color: '#FF9800', fontSize: '14px' }}>
                🤖 AI正在思考...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 游戏棋盘 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '5px',
        maxWidth: '300px',
        margin: '0 auto'
      }}>
        {G.cells.map((cell, index) => (
          <button
            key={index}
            onClick={() => onClick(index)}
            disabled={!isMyTurn || cell !== null || ctx.gameover}
            style={{
              width: '80px',
              height: '80px',
              fontSize: '2rem',
              fontWeight: 'bold',
              border: '2px solid #333',
              backgroundColor: cell ? '#e0e0e0' : '#fff',
              cursor: isMyTurn && cell === null && !ctx.gameover ? 'pointer' : 'not-allowed',
              color: cell === '0' ? '#f44336' : '#2196f3'
            }}
          >
            {cell === '0' ? 'X' : cell === '1' ? 'O' : ''}
          </button>
        ))}
      </div>

      {/* AI组件 */}
      {getBotComponent()}
    </div>
  );
};

export default TicTacToeBoard; 