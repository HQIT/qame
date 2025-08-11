import React, { useState, useEffect } from 'react';
import UserManagement from './admin/UserManagement';

import AIConfigManagement from './admin/AIConfigManagement';
import GameDatabaseManagement from './admin/GameDatabaseManagement';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState(() => {
    // 从sessionStorage恢复tab状态，处理失效的ai-clients标签
    const savedTab = sessionStorage.getItem('adminActiveTab');
    if (savedTab === 'ai-clients') {
      // 将失效的ai-clients重定向到ai-configs
      sessionStorage.setItem('adminActiveTab', 'ai-configs');
      return 'ai-configs';
    }
    return savedTab || 'users';
  });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '10px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* 标题栏 */}
        <div style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '20px',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          👨‍💼 管理员控制台
        </div>

        {/* 标签页导航 */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #eee'
        }}>

          <button
            onClick={() => {
              setActiveTab('users');
              sessionStorage.setItem('adminActiveTab', 'users');
            }}
            style={{
              padding: '15px 25px',
              border: 'none',
              backgroundColor: activeTab === 'users' ? '#3498db' : 'transparent',
              color: activeTab === 'users' ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'users' ? 'bold' : 'normal'
            }}
          >
            👥 用户管理
          </button>
          <button
            onClick={() => {
              setActiveTab('ai-configs');
              sessionStorage.setItem('adminActiveTab', 'ai-configs');
            }}
            style={{
              padding: '15px 25px',
              border: 'none',
              backgroundColor: activeTab === 'ai-configs' ? '#3498db' : 'transparent',
              color: activeTab === 'ai-configs' ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'ai-configs' ? 'bold' : 'normal'
            }}
          >
            🤖 AI管理中心
          </button>
          <button
            onClick={() => {
              setActiveTab('game-db');
              sessionStorage.setItem('adminActiveTab', 'game-db');
            }}
            style={{
              padding: '15px 25px',
              border: 'none',
              backgroundColor: activeTab === 'game-db' ? '#3498db' : 'transparent',
              color: activeTab === 'game-db' ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'game-db' ? 'bold' : 'normal'
            }}
          >
            🎮 游戏数据库
          </button>

        </div>

        {/* 内容区域 */}
        <div style={{ padding: '20px' }}>

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'ai-configs' && <AIConfigManagement />}
          {activeTab === 'game-db' && <GameDatabaseManagement />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 