import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import NewEnhancedLobby from './components/NewEnhancedLobby';
import GameView from './components/GameView';

import { api } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    // 从sessionStorage恢复视图状态
    return sessionStorage.getItem('currentView') || 'lobby';
  });
  const [isAdmin, setIsAdmin] = useState(false);
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
          setUser(data.data);
          // 检查是否为管理员
          setIsAdmin(data.data.role === 'admin');
          // 保存用户信息到sessionStorage
          sessionStorage.setItem('user', JSON.stringify(data.data));
          
          // 用户认证成功后立即发送心跳，标记为在线
          try {
            await api.sendHeartbeat();
            console.log('✅ 用户上线心跳发送成功');
          } catch (error) {
            console.warn('⚠️ 发送上线心跳失败:', error);
          }
        } else {
          // token无效，清除本地存储
          sessionStorage.removeItem('user');
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('验证token失败:', error);
        sessionStorage.removeItem('user');
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
    setIsAdmin(userData.role === 'admin');
    
    // 用户登录后立即发送心跳，标记为在线
    try {
      await api.sendHeartbeat();
      console.log('✅ 用户登录心跳发送成功');
    } catch (error) {
      console.warn('⚠️ 发送登录心跳失败:', error);
    }
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
    sessionStorage.removeItem('adminActiveTab');
    setUser(null);
    setIsAdmin(false);
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
              

              
              {isAdmin && (
                <button
                  onClick={() => handleViewChange(currentView === 'admin' ? 'lobby' : 'admin')}
                  style={{
                    backgroundColor: currentView === 'admin' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    border: '1px solid white',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {currentView === 'admin' ? '返回游戏' : '管理控制台'}
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
          {currentView === 'admin' && <AdminPanel />}
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
    );
  }

  // 如果用户未登录，显示登录页面
  return <Login onLogin={handleLogin} />;
}

export default App; 