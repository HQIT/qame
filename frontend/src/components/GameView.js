import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer'
import TicTacToe from '../games/TicTacToe';
import TicTacToeBoard from '../games/TicTacToeBoard';
import { api } from '../utils/api';

const GameView = ({ matchID, playerID, playerName, gameName = 'tic-tac-toe', onReturnToLobby }) => {
  const [matchInfo, setMatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [gameClientError, setGameClientError] = useState(null);
  const [playerCredentials, setPlayerCredentials] = useState(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  // 获取match信息
  useEffect(() => {
    const fetchMatchInfo = async () => {
      try {
        // 首先尝试通过我们的API获取match信息
        const matchResponse = await api.getMatches();
        if (matchResponse.code === 200) {
          // 找到对应的match
          const currentMatch = matchResponse.data.find(match => 
            match.bgio_match_id === matchID || match.id === matchID
          );
          if (currentMatch) {
            setMatchInfo(currentMatch);
          }
        }
      } catch (error) {
        console.error('获取match信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchInfo();
  }, [matchID]);

  // 获取playerCredentials
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setCredentialsLoading(true);
        console.log('🔐 获取playerCredentials for matchID:', matchID);
        
        const response = await api.getCredentials(matchID);
        
        if (response.code === 200) {
          console.log('✅ 获取playerCredentials成功:', response.data);
          setPlayerCredentials(response.data.playerCredentials);
          setConnectionError(null);
        } else {
          console.error('❌ 获取playerCredentials失败:', response.message);
          setConnectionError(`获取credentials失败: ${response.message}`);
        }
      } catch (error) {
        console.error('❌ 获取playerCredentials出错:', error);
        setConnectionError(`获取credentials出错: ${error.message || error}`);
      } finally {
        setCredentialsLoading(false);
      }
    };

    if (matchID) {
      fetchCredentials();
    }
  }, [matchID]);

  // 创建GameClient组件 - 只有在credentials准备好后才创建
  const GameClient = useMemo(() => {
    // 如果还在加载credentials，或者没有credentials，不创建客户端
    if (credentialsLoading || !playerCredentials) {
      console.log('⏳ 等待playerCredentials加载...', { credentialsLoading, playerCredentials });
      return null;
    }

    try {
      console.log('🔌 创建boardgame.io客户端:', {
        server: window.location.origin,
        gameServer: window.location.origin,
        willPassPropsAtRender: true
      });

      const ClientComponent = Client({
        game: TicTacToe,
        board: (props) => <TicTacToeBoard {...props} matchInfo={matchInfo} />,
        debug: false, // 关闭debug模式以减少日志输出
        multiplayer: SocketIO({ 
          server: window.location.origin
        }),
        // 详细错误处理和状态显示
        onConnect: () => {
          console.log('✅ boardgame.io 连接成功');
          setConnectionError(null);
          setGameClientError(null);
          setIsConnected(true);
        },
        onDisconnect: () => {
          console.log('❌ boardgame.io 连接断开');
          setConnectionError('🔌 与游戏服务器的连接已断开 - 检查网络或重新进入游戏');
          setIsConnected(false);
        },
        onConnectionError: (error) => {
          console.error('❌ boardgame.io 连接错误:', error);
          const errorMsg = `🚨 boardgame.io连接失败: ${error.message || error}`;
          setConnectionError(errorMsg);
          setIsConnected(false);
        },
        onUpdateError: (error) => {
          console.error('❌ boardgame.io 更新错误:', error);
          setConnectionError(`🔄 游戏状态更新失败: ${error.message || error}`);
        },
        onSyncError: (error) => {
          console.error('❌ boardgame.io 同步错误:', error);
          setConnectionError(`🔄 游戏同步失败: ${error.message || error}`);
        }
      });

      return ClientComponent;
    } catch (error) {
      console.error('❌ 创建GameClient失败:', error);
      setGameClientError(`客户端创建失败: ${error.message}`);
      return null;
    }
  }, [matchID, playerID, playerName, playerCredentials, credentialsLoading, matchInfo]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 清理客户端引用
      clientRef.current = null;
      // 重置连接状态
      setIsConnected(false);
      setConnectionError(null);
      setGameClientError(null);
    };
  }, []);

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
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Match ID: {matchID}
          </p>
          
          {/* 玩家信息 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '10px',
            flexWrap: 'wrap'
          }}>
            {loading ? (
              <p style={{ color: '#666', fontSize: '14px' }}>加载玩家信息...</p>
            ) : matchInfo && matchInfo.players ? (
              matchInfo.players.map((player, index) => (
                <div
                  key={player.id || index}
                  style={{
                    backgroundColor: player.seatIndex.toString() === playerID ? '#e7f3ff' : '#f8f9fa',
                    border: player.seatIndex.toString() === playerID ? '2px solid #007bff' : '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    minWidth: '120px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: player.seatIndex === 0 ? '#f44336' : '#2196f3',
                    marginBottom: '5px'
                  }}>
                    {player.isAI ? '🤖' : '👤'} {player.seatIndex === 0 ? 'X' : 'O'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {player.playerName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                    {player.seatIndex.toString() === playerID ? '(你)' : `座位 ${player.seatIndex}`}
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                backgroundColor: '#e7f3ff',
                border: '2px solid #007bff',
                borderRadius: '8px',
                padding: '10px 15px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>
                  👤 当前玩家
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {playerName}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                  ID: {playerID}
                </div>
              </div>
            )}
          </div>
          
          {/* Match状态 */}
          {matchInfo && (
            <p style={{ color: '#666', fontSize: '12px' }}>
              状态: <span style={{ 
                color: matchInfo.status === 'playing' ? '#28a745' : '#6c757d',
                fontWeight: 'bold'
              }}>
                {matchInfo.status === 'waiting' ? '等待中' : 
                 matchInfo.status === 'playing' ? '游戏中' : 
                 matchInfo.status === 'finished' ? '已结束' : '已取消'}
              </span>
            </p>
          )}
        </div>
        
        {GameClient && (
          <GameClient 
            matchID={matchID}
            playerID={playerID}
            playerName={playerName}
            credentials={playerCredentials}
          />
        )}
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              if (onReturnToLobby) {
                onReturnToLobby();
              } else {
                // 兜底方案：如果没有提供回调，使用状态管理
                window.history.back();
              }
            }}
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
