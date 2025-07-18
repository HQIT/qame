import React, { useEffect, useState } from 'react';
import { getLLMMove, isLLMServiceAvailable } from '../services/llmService';
import { generateGamePrompt } from '../prompts/tictactoePrompt';

/**
 * LLM Bot 组件
 * 使用大语言模型进行井字棋游戏决策
 */
const LLMBot = ({ G, ctx, moves, playerID, isActive, isAIPlayer }) => {
  const [isThinking, setIsThinking] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  // 添加组件渲染调试日志
  console.log('🧠 LLMBot组件渲染:', {
    playerID,
    isActive,
    isAIPlayer,
    gameover: ctx.gameover,
    currentPlayer: ctx.currentPlayer,
    cells: G.cells
  });

  // LLM Bot 自动移动逻辑
  useEffect(() => {
    console.log('🧠 LLMBot useEffect触发:', {
      isAIPlayer,
      isActive,
      gameover: ctx.gameover,
      shouldExecute: isAIPlayer && isActive && !ctx.gameover
    });
    
    if (isAIPlayer && isActive && !ctx.gameover) {
      console.log('🧠 LLMBot开始执行自动移动逻辑');
      setIsThinking(true);
      setIsOffline(false);
      
      // 延迟一下，让玩家看到AI在"思考"
      const timer = setTimeout(async () => {
        try {
          console.log('🧠 准备检查LLM服务可用性...');
          // 检查LLM服务是否可用
          if (!isLLMServiceAvailable()) {
            console.warn('⚠️ LLM服务不可用，使用fallback策略');
            console.log('🔧 服务配置检查:', {
              hasApiKey: !!process.env.REACT_APP_OPENAI_API_KEY,
              apiKeyLength: process.env.REACT_APP_OPENAI_API_KEY?.length,
              hasEndpoint: !!process.env.REACT_APP_LLM_API_ENDPOINT,
              endpoint: process.env.REACT_APP_LLM_API_ENDPOINT
            });
            setIsOffline(true);
            const fallbackMove = findFallbackMove(G.cells, playerID);
            if (fallbackMove !== -1) {
              console.log('🔄 服务不可用时使用fallback移动:', fallbackMove);
              setLastMove(fallbackMove);
              moves.clickCell(fallbackMove);
            }
            setIsThinking(false);
            return;
          }

          // 生成提示词
          const prompt = generateGamePrompt(G.cells, playerID, ctx.currentPlayer);
          console.log('🤖 LLMBot开始调用LLM...');
          console.log('🎮 当前游戏状态:', {
            cells: G.cells,
            playerID,
            currentPlayer: ctx.currentPlayer,
            gameover: ctx.gameover
          });

          // 调用LLM API
          const move = await getLLMMove(prompt);
          
          if (move !== -1 && G.cells[move] === null) {
            console.log('✅ LLM成功选择位置:', move);
            setLastMove(move);
            moves.clickCell(move);
          } else {
            console.warn('⚠️ LLM返回无效移动，使用fallback策略');
            console.log('🔍 检查移动有效性:', {
              move,
              isValidMove: move !== -1,
              isPositionEmpty: G.cells[move] === null,
              availablePositions: G.cells.map((cell, index) => cell === null ? index : null).filter(x => x !== null)
            });
            setIsOffline(true);
            const fallbackMove = findFallbackMove(G.cells, playerID);
            if (fallbackMove !== -1) {
              console.log('🔄 使用fallback移动:', fallbackMove);
              setLastMove(fallbackMove);
              moves.clickCell(fallbackMove);
            }
          }
        } catch (error) {
          console.error('❌ LLM Bot执行失败:', error);
          console.error('🔍 错误详情:', {
            message: error.message,
            stack: error.stack,
            gameState: {
              cells: G.cells,
              playerID,
              currentPlayer: ctx.currentPlayer
            }
          });
          setIsOffline(true);
          const fallbackMove = findFallbackMove(G.cells, playerID);
          if (fallbackMove !== -1) {
            console.log('🔄 错误后使用fallback移动:', fallbackMove);
            setLastMove(fallbackMove);
            moves.clickCell(fallbackMove);
          }
        } finally {
          setIsThinking(false);
        }
      }, 1500); // 稍微长一点的延迟，因为LLM调用需要时间

      return () => clearTimeout(timer);
    }
  }, [isAIPlayer, isActive, G.cells, playerID, moves, ctx.gameover, ctx.currentPlayer]);

  // 如果当前玩家是AI，显示AI状态
  if (isAIPlayer && isActive && !ctx.gameover) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        backgroundColor: isOffline ? '#f8d7da' : '#fff3cd',
        borderRadius: '8px',
        border: isOffline ? '1px solid #f5c6cb' : '1px solid #ffeaa7',
        margin: '10px 0'
      }}>
        <div style={{ 
          fontSize: '1.2rem', 
          color: isOffline ? '#721c24' : '#856404',
          marginBottom: '8px'
        }}>
          {isOffline ? '🤖 LLM Bot (离线模式)' : '🤖 LLM Bot 正在思考中...'}
        </div>
        {isThinking && (
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            ⏳ 正在调用大语言模型...
          </div>
        )}
        {lastMove !== null && (
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
            上次选择位置: {lastMove}
          </div>
        )}
      </div>
    );
  }

  return null;
};

/**
 * Fallback策略：找到任意可用的位置
 * @param {Array} cells - 棋盘状态
 * @param {string} playerID - 玩家ID
 * @returns {number} 位置索引，没有可用位置返回-1
 */
function findFallbackMove(cells, playerID) {
  // 简单的fallback策略：选择第一个可用位置
  for (let i = 0; i < 9; i++) {
    if (cells[i] === null) {
      return i;
    }
  }
  return -1;
}

export default LLMBot; 