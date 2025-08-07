import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const OnlinePlayers = ({ currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, idle: 0, playing: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 获取在线用户列表
  const fetchOnlineUsers = async () => {
    try {
      const response = await api.getOnlineUsers();
      if (response.code === 200) {
        setOnlineUsers(response.data.users || []);
        setStats(response.data.stats || { total: 0, idle: 0, playing: 0 });
        setError(null);
      } else if (response.code === 401) {
        // 未认证，这是正常情况，不显示错误
        setError(null);
        setOnlineUsers([]);
        setStats({ total: 0, idle: 0, playing: 0 });
      } else {
        console.warn('获取在线用户API返回错误:', response);
        setError(response.message || '获取在线用户失败');
        // 不清空现有数据，保持上次的状态
      }
    } catch (error) {
      console.error('获取在线用户失败:', error);
      // 如果是401未认证错误，清空数据
      if (error.status === 401) {
        setError(null);
        setOnlineUsers([]);
        setStats({ total: 0, idle: 0, playing: 0 });
      } else {
        setError('网络错误');
        // 不清空现有数据，保持上次的状态
      }
    } finally {
      setLoading(false);
    }
  };

  // 发送心跳保持在线状态
  const sendHeartbeat = async () => {
    try {
      const response = await api.sendHeartbeat();
      
      // 检查响应状态码
      if (response.code !== 200) {
        console.error('❌ 心跳API返回错误:', response);
        throw new Error(`心跳失败: ${response.message}`);
      }
      
      console.log('✅ 心跳发送成功:', response);
      return response;
    } catch (error) {
      console.error('❌ 发送心跳失败:', error);
      // 如果是认证错误，可能需要重新登录
      if (error.status === 401) {
        console.warn('⚠️ 心跳认证失败，可能需要重新登录');
      }
      throw error;
    }
  };

  // 组件挂载时获取数据并开始心跳（只有在用户已登录时）
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    fetchOnlineUsers();
    sendHeartbeat();

    // 定时获取在线用户列表（30秒）
    const fetchInterval = setInterval(fetchOnlineUsers, 30000);
    
    // 定时发送心跳（2分钟）
    const heartbeatInterval = setInterval(sendHeartbeat, 120000);

    // 页面关闭时通知服务器下线
    const handleBeforeUnload = () => {
      if (currentUser) {
        const formData = new FormData();
        formData.append('data', '{}');
        navigator.sendBeacon(
          `${process.env.REACT_APP_API_SERVER || 'http://localhost:8001'}/api/online/offline`,
          formData
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 组件卸载时设置离线状态
      if (currentUser) {
        api.setOffline().catch(console.error);
      }
    };
  }, [currentUser]);

  // 格式化在线时长
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  };

  // 获取状态图标和颜色
  const getStatusInfo = (status) => {
    switch (status) {
      case 'idle':
        return { icon: '🟢', text: '空闲', color: '#27ae60' };
      case 'playing':
        return { icon: '🎮', text: '游戏中', color: '#3498db' };
      default:
        return { icon: '⚪', text: '未知', color: '#95a5a6' };
    }
  };

  // 如果用户未登录，显示提示信息
  if (!currentUser) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minHeight: '300px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50' }}>
          🌐 在线玩家
        </h3>
        <div style={{ textAlign: 'center', color: '#666' }}>
          请先登录查看在线玩家
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minHeight: '300px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50' }}>
          🌐 在线玩家
        </h3>
        <div style={{ textAlign: 'center', color: '#666' }}>
          🔄 加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minHeight: '300px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50' }}>
          🌐 在线玩家
        </h3>
        <div style={{ textAlign: 'center', color: '#e74c3c' }}>
          ❌ {error}
        </div>
        <button
          onClick={fetchOnlineUsers}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      minHeight: '300px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50' }}>
        🌐 在线玩家 ({stats.total})
      </h3>

      {/* 统计信息 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
            {stats.idle}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>空闲</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            {stats.playing}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>游戏中</div>
        </div>
      </div>

      {/* 在线用户列表 */}
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {onlineUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '20px'
          }}>
            暂无在线玩家
          </div>
        ) : (
          onlineUsers.map((user) => {
            const statusInfo = getStatusInfo(user.status);
            return (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: '1px solid #ecf0f1',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>
                      {user.player_type === 'ai' ? '🤖 ' : ''}{user.username}
                    </span>
                    {user.role === 'admin' && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}>
                        管理员
                      </span>
                    )}
                    {user.role === 'ai' && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        backgroundColor: '#9b59b6',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}>
                        AI
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <span style={{ color: statusInfo.color }}>
                      {statusInfo.icon} {statusInfo.text}
                    </span>
                    <span style={{ marginLeft: '12px' }}>
                      ⏱️ {formatDuration(user.onlineDuration)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 刷新按钮 */}
      <div style={{
        textAlign: 'center',
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #ecf0f1'
      }}>
        <button
          onClick={fetchOnlineUsers}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
        >
          🔄 刷新
        </button>
      </div>
    </div>
  );
};

export default OnlinePlayers;
