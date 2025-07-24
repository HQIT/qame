import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      
      if (data.code === 200) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取系统统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          🔄 正在加载系统统计...
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#e74c3c' }}>
          ❌ 获取系统统计失败
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>系统概览</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {/* 用户统计 */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>👥 用户统计</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {stats.users?.total || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
            总用户数
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            <div style={{ color: '#28a745' }}>管理员: {stats.users?.admin_count || 0}</div>
            <div style={{ color: '#6c757d' }}>普通用户: {stats.users?.user_count || 0}</div>
          </div>
        </div>

        {/* 房间统计 */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>🏠 房间统计</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {stats.rooms?.total || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
            总房间数
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            <div style={{ color: '#ffc107' }}>等待中: {stats.rooms?.waiting || 0}</div>
            <div style={{ color: '#28a745' }}>进行中: {stats.rooms?.active || 0}</div>
          </div>
        </div>

        {/* 在线用户 */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>🟢 在线用户</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
            {stats.online?.total || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
            当前在线
          </div>
        </div>
      </div>

      {/* 刷新按钮 */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={fetchStats}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 刷新统计
        </button>
      </div>
    </div>
  );
};

export default SystemStats; 