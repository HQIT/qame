import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import { DialogProvider } from '@qame/shared-ui';
import NewEnhancedLobby from './components/NewEnhancedLobby';
import GameView from './components/GameView';

import { api } from '@qame/shared-utils';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    // 从sessionStorage恢复视图状态
    return sessionStorage.getItem('currentView') || 'lobby';
  });

  const [gameState, setGameState] = useState(() => {
    // 从sessionStorage恢复游戏状态
    const savedGameState = sessionStorage.getItem('gameState');
    return savedGameState ? JSON.parse(savedGameState) : null;
  });


  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.verify();
        
        if (data.code === 200) {
          // token有效，设置用户信息
          const userData = data.data;
          
          // 立即获取用户的player信息
          try {
            const playerResponse = await api.getMyPlayer();
            if (playerResponse.code === 200) {
              userData.player = playerResponse.data;
              console.log('✅ 用户player信息获取成功:', playerResponse.data);
            } else {
              console.warn('⚠️ 获取用户player信息失败:', playerResponse.message);
            }
          } catch (error) {
            console.warn('⚠️ 获取用户player信息异常:', error);
          }
          
          setUser(userData);
          // 保存完整用户信息（包含player）到sessionStorage
          sessionStorage.setItem('user', JSON.stringify(userData));
        } else {
          // token无效，清除本地存储
          sessionStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('验证token失败:', error);
        sessionStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // 如果是会话过期跳转回来，给出提示（可选）
    try {
      if (sessionStorage.getItem('sessionExpired') === '1') {
        sessionStorage.removeItem('sessionExpired');
        console.warn('会话已过期，请重新登录');
      }
    } catch (_) {}
  }, []);

  const handleLogin = async (userData) => {
    // 登录成功后立即获取用户的player信息
    try {
      const playerResponse = await api.getMyPlayer();
      if (playerResponse.code === 200) {
        userData.player = playerResponse.data;
        console.log('✅ 登录时player信息获取成功:', playerResponse.data);
      } else {
        console.warn('⚠️ 登录时获取用户player信息失败:', playerResponse.message);
      }
    } catch (error) {
      console.warn('⚠️ 登录时获取用户player信息异常:', error);
    }
    
    setUser(userData);
    
    // 保存完整用户信息（包含player）到sessionStorage
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
    
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('currentView');
    sessionStorage.removeItem('gameState');
    setUser(null);
    setCurrentView('lobby');
    setGameState(null);
  };

  const handleViewChange = (newView) => {
    setCurrentView(newView);
    sessionStorage.setItem('currentView', newView);
    // 只有在切换到非游戏视图且不是从游戏返回大厅时才清除游戏状态
    if (newView !== 'game' && newView !== 'lobby') {
      setGameState(null);
      sessionStorage.removeItem('gameState');
    }
  };

  const handleGameStart = (matchID, playerID, playerName, gameName) => {
    const newGameState = { matchID, playerID, playerName, gameName };
    setGameState(newGameState);
    sessionStorage.setItem('gameState', JSON.stringify(newGameState));
    setCurrentView('game');
    sessionStorage.setItem('currentView', 'game');
  };

  const handleReturnToLobby = () => {
    setCurrentView('lobby');
    sessionStorage.setItem('currentView', 'lobby');
    // 不清除gameState，保持游戏状态以便用户可以重新进入
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
            🔄 正在加载...
          </div>
        </div>
      </div>
    );
  }

  // 如果用户已登录，显示游戏选择器
  if (user) {
    return (
      <DialogProvider>
        <div>
        {/* 顶部导航栏 */}
        <div style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            🎮 多人游戏平台
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>
              欢迎，{user.username}！
            </span>
            
            {/* 导航按钮 */}
            <div style={{ display: 'flex', gap: '10px', marginRight: '15px' }}>
              <button
                onClick={() => handleViewChange('lobby')}
                style={{
                  backgroundColor: currentView === 'lobby' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid white',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                游戏大厅
              </button>
              
              {user.role === 'admin' && (
                <button
                  onClick={() => window.location.href = '/admin/'}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid white',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  管理控制台
                </button>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid white',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 主内容区域 */}
        <div style={{ flex: 1, padding: '20px' }}>
          {currentView === 'lobby' && <NewEnhancedLobby onGameStart={handleGameStart} />}
          {currentView === 'game' && gameState && (
            <GameView 
              matchID={gameState.matchID}
              playerID={gameState.playerID}
              playerName={gameState.playerName}
              gameName={gameState.gameName}
              onReturnToLobby={handleReturnToLobby}
            />
          )}
        </div>
        </div>
      </DialogProvider>
    );
  }

  // 如果用户未登录，显示登录页面
  return (
    <DialogProvider>
      <Login onLogin={handleLogin} />
    </DialogProvider>
  );
}

export default App; 