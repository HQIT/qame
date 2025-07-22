import React, { useState, useEffect } from 'react';
import GameSelector from './components/GameSelector';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // 验证token是否有效
          const response = await fetch(`${process.env.REACT_APP_API_SERVER || 'http://localhost:8001'}/api/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          const data = await response.json();
          
          if (data.success) {
            setUser(JSON.parse(savedUser));
          } else {
            // token无效，清除本地存储
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('验证token失败:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
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
        <GameSelector />
      </div>
    );
  }

  // 如果用户未登录，显示登录页面
  return <Login onLogin={handleLogin} />;
}

export default App; 