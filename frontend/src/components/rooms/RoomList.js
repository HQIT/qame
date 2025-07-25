import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import CreateRoom from './CreateRoom';

const RoomList = ({ onRoomSelect }) => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [games, setGames] = useState([]);
  const [filters, setFilters] = useState({
    gameId: '',
    status: ''
  });

  // 获取房间列表
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await api.getRooms();
      
      if (response.code === 200) {
        setRooms(response.data);
        setFilteredRooms(response.data);
      } else {
        setError(response.message || '获取房间列表失败');
      }
    } catch (error) {
      console.error('获取房间列表失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取游戏列表
  const fetchGames = async () => {
    try {
      const response = await api.getGames();
      if (response.code === 200) {
        setGames(response.data);
      }
    } catch (error) {
      console.error('获取游戏列表失败:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchGames();
  }, []);

  // 删除房间
  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('确定要删除这个房间吗？')) {
      return;
    }

    try {
      const response = await api.deleteRoom(roomId);
      
      if (response.code === 200) {
        // 重新获取房间列表
        fetchRooms();
      } else {
        alert(response.message || '删除房间失败');
      }
    } catch (error) {
      console.error('删除房间失败:', error);
      alert('删除房间失败');
    }
  };

  // 获取状态显示文本
  const getStatusText = (status) => {
    const statusMap = {
      'waiting': '等待中',
      'ready': '准备就绪',
      'playing': '游戏中',
      'finished': '已结束'
    };
    return statusMap[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status) => {
    const colorMap = {
      'waiting': '#ff9800',
      'ready': '#4caf50',
      'playing': '#2196f3',
      'finished': '#9e9e9e'
    };
    return colorMap[status] || '#666';
  };

  // 筛选房间
  const applyFilters = () => {
    let filtered = rooms;

    if (filters.gameId) {
      filtered = filtered.filter(room => room.game_id === filters.gameId);
    }

    if (filters.status) {
      filtered = filtered.filter(room => room.status === filters.status);
    }

    setFilteredRooms(filtered);
  };

  // 处理筛选变化
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 清除筛选
  const clearFilters = () => {
    setFilters({
      gameId: '',
      status: ''
    });
  };

  // 当筛选条件变化时应用筛选
  useEffect(() => {
    applyFilters();
  }, [filters, rooms]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>加载房间列表中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
        <div>{error}</div>
        <button onClick={fetchRooms} style={{ marginTop: '10px' }}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2>游戏房间</h2>
        <button 
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          创建房间
        </button>
      </div>

      {/* 筛选器 */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          筛选条件
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              游戏类型
            </label>
            <select
              value={filters.gameId}
              onChange={(e) => handleFilterChange('gameId', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">全部游戏</option>
              {games.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              房间状态
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">全部状态</option>
              <option value="waiting">等待中</option>
              <option value="ready">准备就绪</option>
              <option value="playing">游戏中</option>
              <option value="finished">已结束</option>
            </select>
          </div>



          <div>
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              清除筛选
            </button>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <CreateRoom 
          onClose={() => setShowCreateForm(false)}
          onRoomCreated={(newRoom) => {
            setShowCreateForm(false);
            fetchRooms();
            if (onRoomSelect) {
              onRoomSelect(newRoom);
            }
          }}
        />
      )}

      {filteredRooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div>
            {rooms.length === 0 ? '暂无房间' : '没有符合条件的房间'}
          </div>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={() => setShowCreateForm(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {rooms.length === 0 ? '创建第一个房间' : '创建新房间'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredRooms.map(room => (
            <div 
              key={room.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
              onClick={() => onRoomSelect && onRoomSelect(room)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '8px' 
                  }}>
                    <h3 style={{ margin: '0', marginRight: '10px' }}>{room.name}</h3>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'white',
                      backgroundColor: getStatusColor(room.status)
                    }}>
                      {getStatusText(room.status)}
                    </span>
                  </div>
                  
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    <div>游戏: {room.game_name}</div>
                    <div>创建者: {room.creator_name}</div>
                    <div>玩家: {room.current_players || 0}/{room.max_players}</div>
                    <div>人类玩家: {room.human_players || 0} | AI玩家: {room.ai_players || 0}</div>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    创建时间: {new Date(room.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRoomSelect && onRoomSelect(room);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    进入
                  </button>
                  
                  {room.created_by === JSON.parse(sessionStorage.getItem('user'))?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList; 