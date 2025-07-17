import React from 'react';
import { Lobby } from 'boardgame.io/react';
import TicTacToe from '../games/TicTacToe';
import TicTacToeBoard from '../games/TicTacToeBoard';

const GameSelector = () => {
  return (
    <div style={{ padding: 50 }}>
      <h1>🎮 多人游戏平台</h1>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3>🎯 游戏说明</h3>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
          <p>• 创建游戏后，你可以选择作为"人类玩家"或"AI Bot"加入</p>
          <p>• 选择"AI Bot"时，该位置将由计算机自动进行游戏</p>
          <p>• 选择"人类玩家"时，你可以手动控制该位置</p>
        </div>
      </div>

      <Lobby
        gameServer={process.env.REACT_APP_SERVER || "http://localhost:8000"}
        lobbyServer={process.env.REACT_APP_SERVER || "http://localhost:8000"}
        gameComponents={[
          { game: TicTacToe, board: TicTacToeBoard }
        ]}
      />
    </div>
  );
};

export default GameSelector; 