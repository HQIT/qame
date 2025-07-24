import React, { useState, useEffect } from 'react';
import GameSelector from './components/GameSelector';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { api } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    // 从sessionStorage恢复视图状态
    return sessionStorage.getItem('currentView') || 'games';
  });
  const [isAdmin, setIsAdmin] = useState(false);

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

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAdmin(userData.role === 'admin');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
    
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('currentView');
    sessionStorage.removeItem('adminActiveTab');
    setUser(null);
    setIsAdmin(false);
    setCurrentView('games');
  };

  const handleViewChange = (newView) => {
    setCurrentView(newView);
    sessionStorage.setItem('currentView', newView);
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
            {isAdmin && (
              <button
                onClick={() => handleViewChange(currentView === 'admin' ? 'games' : 'admin')}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid white',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginRight: '10px'
                }}
              >
                {currentView === 'admin' ? '返回游戏' : '管理控制台'}
              </button>
            )}
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

        {/* 游戏内容 */}
        {currentView === 'admin' ? <AdminPanel /> : <GameSelector />}
      </div>
    );
  }

  // 如果用户未登录，显示登录页面
  return <Login onLogin={handleLogin} />;
}

export default App; 