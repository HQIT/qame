import React from 'react';
import { Client } from 'boardgame.io/react';
import TicTacToe from '../games/TicTacToe';
import TicTacToeBoard from '../games/TicTacToeBoard';

const GameView = ({ matchID, playerID, playerName, gameName = 'tic-tac-toe' }) => {
  const GameClient = Client({
    game: TicTacToe,
    board: TicTacToeBoard,
    debug: false,
    matchID,
    playerID,
    playerName,
    server: process.env.REACT_APP_SERVER || "http://localhost:8000"
  });

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#495057', marginBottom: '10px' }}>🎮 井字棋游戏</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Match ID: {matchID} | 玩家: {playerName} (ID: {playerID})
          </p>
        </div>
        
        <GameClient />
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => window.location.href = '/lobby'}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← 返回游戏大厅
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameView;
