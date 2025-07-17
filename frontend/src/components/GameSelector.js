import React, { useState } from 'react';
import { Lobby } from 'boardgame.io/react';
import TicTacToe from '../games/TicTacToe';
import TicTacToeBoard from '../games/TicTacToeBoard';

const GameSelector = () => {
  const [enableAI, setEnableAI] = useState(false);

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
          <p>• 创建游戏后，你可以选择启用或禁用AI Bot</p>
          <p>• 启用AI Bot时：第二个玩家位置将由AI自动控制，你可以与AI对战</p>
          <p>• 禁用AI Bot时：两个玩家都需要手动操作，实现人人对战</p>
          <p>• 游戏规则：轮流在3x3网格中放置X和O，先连成三个者获胜</p>
        </div>
      </div>

      {/* AI Bot 开关 */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#e8f5e8',
        borderRadius: '8px',
        border: '1px solid #4caf50'
      }}>
        <h3>🤖 AI Bot 设置</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enableAI}
              onChange={(e) => setEnableAI(e.target.checked)}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: '16px' }}>
              {enableAI ? '启用 AI Bot (人机对战)' : '禁用 AI Bot (人人对战)'}
            </span>
          </label>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {enableAI ? 
            '✅ AI Bot已启用：第二个玩家位置将由AI自动控制，你可以与AI进行对战' : 
            '👥 人人对战模式：两个玩家都需要手动操作，适合朋友间对战'
          }
        </div>
      </div>

      <Lobby
        gameServer={process.env.REACT_APP_SERVER || "http://localhost:8000"}
        lobbyServer={process.env.REACT_APP_SERVER || "http://localhost:8000"}
        gameComponents={[
          { 
            game: TicTacToe, 
            board: (props) => <TicTacToeBoard {...props} enableAI={enableAI} />
          }
        ]}
      />
    </div>
  );
};

export default GameSelector; 