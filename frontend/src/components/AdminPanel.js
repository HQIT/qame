import React, { useState, useEffect } from 'react';
import UserManagement from './admin/UserManagement';
import SystemStats from './admin/SystemStats';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('stats');

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
            onClick={() => setActiveTab('stats')}
            style={{
              padding: '15px 25px',
              border: 'none',
              backgroundColor: activeTab === 'stats' ? '#3498db' : 'transparent',
              color: activeTab === 'stats' ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'stats' ? 'bold' : 'normal'
            }}
          >
            📊 系统统计
          </button>
          <button
            onClick={() => setActiveTab('users')}
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
        </div>

        {/* 内容区域 */}
        <div style={{ padding: '20px' }}>
          {activeTab === 'stats' && <SystemStats />}
          {activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 