import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const GameDatabaseManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameStates, setGameStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 加载比赛数据
  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getBgioMatches();
      if (response.code === 200) {
        setMatches(response.data.matches || []);
      } else {
        setError(response.message || '获取比赛数据失败');
      }
    } catch (error) {
      console.error('加载比赛数据失败:', error);
      setError('加载比赛数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载玩家数据
  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      // 这个API需要在后端实现
      const response = await api.get('/api/admin/players');
      if (response.code === 200) {
        setPlayers(response.data || []);
      } else {
        setError(response.message || '获取玩家数据失败');
      }
    } catch (error) {
      console.error('加载玩家数据失败:', error);
      setError('加载玩家数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载游戏状态数据
  const loadGameStates = async () => {
    setLoading(true);
    setError(null);
    try {
      // 这个API需要在后端实现
      const response = await api.get('/api/admin/game-states');
      if (response.code === 200) {
        setGameStates(response.data || []);
      } else {
        setError(response.message || '获取游戏状态数据失败');
      }
    } catch (error) {
      console.error('加载游戏状态数据失败:', error);
      setError('加载游戏状态数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除比赛
  const deleteMatch = async (matchId) => {
    if (!window.confirm(`确定要删除比赛 ${matchId} 吗？这将同时删除相关的游戏状态数据。`)) {
      return;
    }
    
    try {
      const response = await api.deleteBgioMatch(matchId);
      if (response.code === 200) {
        setMatches(matches.filter(match => match.id !== matchId));
        alert('比赛删除成功');
      } else {
        alert(response.message || '删除比赛失败');
      }
    } catch (error) {
      console.error('删除比赛失败:', error);
      alert('删除比赛失败');
    }
  };



  useEffect(() => {
    if (activeSubTab === 'matches') {
      loadMatches();
    } else if (activeSubTab === 'players') {
      loadPlayers();
    } else if (activeSubTab === 'states') {
      loadGameStates();
    }
  }, [activeSubTab]);

  const renderMatches = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>比赛管理</h3>
        <div>
          <button
            onClick={loadMatches}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            刷新数据
          </button>

        </div>
      </div>

      {loading && <div>正在加载...</div>}
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>比赛ID</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>游戏类型</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>状态</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>玩家数</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>创建时间</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{match.id}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{match.gameName}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: match.status === 'finished' ? '#27ae60' : 
                                   match.status === 'playing' ? '#f39c12' : '#95a5a6',
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    {match.status}
                  </span>
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{match.playerCount}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {new Date(match.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <button
                    onClick={() => deleteMatch(match.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div>
      <h3>游戏玩家数据</h3>
      <p>显示boardgame.io存储的玩家信息</p>
      {/* 这里需要根据实际的数据库结构来实现 */}
    </div>
  );

  const renderGameStates = () => (
    <div>
      <h3>游戏状态数据</h3>
      <p>显示boardgame.io存储的游戏状态信息</p>
      {/* 这里需要根据实际的数据库结构来实现 */}
    </div>
  );

  return (
    <div>
      {/* 子标签页导航 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #eee',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveSubTab('matches')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeSubTab === 'matches' ? '#3498db' : 'transparent',
            color: activeSubTab === 'matches' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeSubTab === 'matches' ? 'bold' : 'normal'
          }}
        >
          🎯 比赛管理
        </button>
        <button
          onClick={() => setActiveSubTab('players')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeSubTab === 'players' ? '#3498db' : 'transparent',
            color: activeSubTab === 'players' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeSubTab === 'players' ? 'bold' : 'normal'
          }}
        >
          👤 玩家数据
        </button>
        <button
          onClick={() => setActiveSubTab('states')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeSubTab === 'states' ? '#3498db' : 'transparent',
            color: activeSubTab === 'states' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeSubTab === 'states' ? 'bold' : 'normal'
          }}
        >
          🎮 游戏状态
        </button>
      </div>

      {/* 内容区域 */}
      {activeSubTab === 'matches' && renderMatches()}
      {activeSubTab === 'players' && renderPlayers()}
      {activeSubTab === 'states' && renderGameStates()}
    </div>
  );
};

export default GameDatabaseManagement;
