import React, { useState } from 'react';
import { Lobby } from 'boardgame.io/react';
import TicTacToe from '../games/TicTacToe';
import TicTacToeBoard from '../games/TicTacToeBoard';

const GameSelector = () => {
  const [enableAI, setEnableAI] = useState(false);
  const [aiType, setAiType] = useState('traditional'); // 'traditional' | 'llm' | 'none'

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
          <p>• 创建游戏后，你可以选择不同的游戏模式</p>
          <p>• 传统AI Bot：使用经典算法进行游戏决策</p>
          <p>• LLM Bot：使用大语言模型进行智能决策</p>
          <p>• 人人对战：两个玩家都需要手动操作</p>
          <p>• 游戏规则：轮流在3x3网格中放置X和O，先连成三个者获胜</p>
        </div>
      </div>

      {/* 游戏模式选择 */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#e8f5e8',
        borderRadius: '8px',
        border: '1px solid #4caf50'
      }}>
        <h3>🎮 游戏模式选择</h3>
        
        {/* 人人对战 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="gameMode"
              value="none"
              checked={aiType === 'none'}
              onChange={(e) => {
                setAiType(e.target.value);
                setEnableAI(false);
              }}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: '16px' }}>
              👥 人人对战
            </span>
          </label>
          <div style={{ fontSize: '14px', color: '#666', marginLeft: '25px' }}>
            两个玩家都需要手动操作，适合朋友间对战
          </div>
        </div>

        {/* 传统AI Bot */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="gameMode"
              value="traditional"
              checked={aiType === 'traditional'}
              onChange={(e) => {
                setAiType(e.target.value);
                setEnableAI(true);
              }}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: '16px' }}>
              🤖 传统AI Bot
            </span>
          </label>
          <div style={{ fontSize: '14px', color: '#666', marginLeft: '25px' }}>
            使用经典算法进行游戏决策，稳定可靠
          </div>
        </div>

        {/* LLM Bot */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="gameMode"
              value="llm"
              checked={aiType === 'llm'}
              onChange={(e) => {
                setAiType(e.target.value);
                setEnableAI(true);
              }}
              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
            />
            <span style={{ fontSize: '16px' }}>
              🧠 LLM Bot
            </span>
          </label>
          <div style={{ fontSize: '14px', color: '#666', marginLeft: '25px' }}>
            使用大语言模型进行智能决策，需要配置API密钥
          </div>
        </div>
      </div>

      <Lobby
        gameServer={window.location.origin}
        lobbyServer={window.location.origin}
        gameComponents={[
          { 
            game: TicTacToe, 
            board: (props) => <TicTacToeBoard {...props} enableAI={enableAI} aiType={aiType} />
          }
        ]}
      />
    </div>
  );
};

export default GameSelector; 