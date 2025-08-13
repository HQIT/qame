import React, { useState, useEffect } from 'react';
import { DialogProvider } from '@qame/shared-ui';
import AdminPanel from './components/AdminPanel';

import { api } from '@qame/shared-utils';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查用户是否已登录且为管理员
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.verify();
        
        if (data.code === 200) {
          const userData = data.data;
          
          // 检查是否为管理员
          if (userData.role !== 'admin') {
            // 非管理员，显示提示并跳转到游戏大厅
            alert('❌ 只有管理员可以访问管理控制台');
            sessionStorage.removeItem('user');
            window.location.href = '/';
            return;
          }
          
          setUser(userData);
          sessionStorage.setItem('user', JSON.stringify(userData));
        } else {
          // token无效，提示并跳转到游戏大厅登录
          alert('⚠️ 请先在游戏大厅登录');
          sessionStorage.removeItem('user');
          window.location.href = '/';
          return;
        }
      } catch (error) {
        console.error('验证token失败:', error);
        alert('⚠️ 请先在游戏大厅登录');
        sessionStorage.removeItem('user');
        window.location.href = '/';
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
    
    sessionStorage.removeItem('user');
    setUser(null);
    // 跳转到游戏大厅
    window.location.href = '/';
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
            🔄 正在验证身份...
          </div>
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示跳转提示（这个状态应该很快就会跳转）
  if (!user) {
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
            🔄 正在跳转到登录页面...
          </div>
        </div>
      </div>
    );
  }

  // 如果用户已登录且为管理员，显示管理控制台
  return (
    <DialogProvider>
      <div>
        {/* 顶部导航栏 */}
        <div style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            👨‍💼 管理员控制台
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>
              欢迎，{user.username}！
            </span>
            
            <div style={{ display: 'flex', gap: '10px', marginRight: '15px' }}>
              <button
                onClick={() => window.location.href = '/'}
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
                返回游戏大厅
              </button>
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
          <AdminPanel />
        </div>
      </div>
    </DialogProvider>
  );
}

export default App;