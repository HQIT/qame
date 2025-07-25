import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const RoomDetail = ({ roomId, onBack }) => {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiTypes, setAiTypes] = useState([]);
  const [selectedAiType, setSelectedAiType] = useState('');
  const [currentUser] = useState(JSON.parse(sessionStorage.getItem('user')));

  // 获取房间详情
  const fetchRoomDetail = async () => {
    try {
      setLoading(true);
      const response = await api.getRoom(roomId);
      
      if (response.code === 200) {
        setRoom(response.data);
      } else {
        setError(response.message || '获取房间详情失败');
      }
    } catch (error) {
      console.error('获取房间详情失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取AI类型列表
  const fetchAITypes = async () => {
    try {
      const response = await api.getAITypes('tic-tac-toe');
      if (response.code === 200) {
        setAiTypes(response.data);
      }
    } catch (error) {
      console.error('获取AI类型失败:', error);
    }
  };

  useEffect(() => {
    fetchRoomDetail();
    fetchAITypes();
  }, [roomId]);

  // 加入座位
  const handleJoinSeat = async (seatNumber) => {
    try {
      const response = await api.joinSeat(roomId, seatNumber);
      
      if (response.code === 200) {
        fetchRoomDetail(); // 重新获取房间详情
      } else {
        alert(response.message || '加入座位失败');
      }
    } catch (error) {
      console.error('加入座位失败:', error);
      alert('加入座位失败');
    }
  };

  // 离开座位
  const handleLeaveSeat = async (seatNumber) => {
    try {
      const response = await api.leaveSeat(roomId, seatNumber);
      
      if (response.code === 200) {
        fetchRoomDetail(); // 重新获取房间详情
      } else {
        alert(response.message || '离开座位失败');
      }
    } catch (error) {
      console.error('离开座位失败:', error);
      alert('离开座位失败');
    }
  };

  // 设置AI座位
  const handleSetAISeat = async (seatNumber) => {
    if (!selectedAiType) {
      alert('请选择AI类型');
      return;
    }

    try {
      const response = await api.setAISeat(roomId, seatNumber, selectedAiType);
      
      if (response.code === 200) {
        fetchRoomDetail(); // 重新获取房间详情
        setSelectedAiType(''); // 清空选择
      } else {
        alert(response.message || '设置AI座位失败');
      }
    } catch (error) {
      console.error('设置AI座位失败:', error);
      alert('设置AI座位失败');
    }
  };

  // 移除AI座位
  const handleRemoveAISeat = async (seatNumber) => {
    try {
      const response = await api.removeAISeat(roomId, seatNumber);
      
      if (response.code === 200) {
        fetchRoomDetail(); // 重新获取房间详情
      } else {
        alert(response.message || '移除AI座位失败');
      }
    } catch (error) {
      console.error('移除AI座位失败:', error);
      alert('移除AI座位失败');
    }
  };

  // 获取座位状态显示
  const getSeatStatusText = (seat) => {
    if (seat.status === 'empty') return '空座位';
    if (seat.status === 'human') return `玩家: ${seat.user_name}`;
    if (seat.status === 'ai') return `AI: ${seat.ai_type_name}`;
    return '未知';
  };

  // 获取座位状态颜色
  const getSeatStatusColor = (seat) => {
    if (seat.status === 'empty') return '#ddd';
    if (seat.status === 'human') return '#4caf50';
    if (seat.status === 'ai') return '#2196f3';
    return '#999';
  };

  // 检查是否是当前用户的座位
  const isCurrentUserSeat = (seat) => {
    return seat.user_id === currentUser?.id;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>加载房间详情中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
        <div>{error}</div>
        <button onClick={fetchRoomDetail} style={{ marginTop: '10px' }}>
          重试
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>房间不存在</div>
        <button onClick={onBack} style={{ marginTop: '10px' }}>
          返回
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          ← 返回房间列表
        </button>
        
        <h2>{room.name}</h2>
        <div style={{ color: '#666', marginBottom: '20px' }}>
          <div>游戏: {room.game_name}</div>
          <div>创建者: {room.creator_name}</div>
          <div>状态: {room.status}</div>
          <div>创建时间: {new Date(room.created_at).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>座位管理</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {room.seats.map((seat, index) => (
            <div
              key={seat.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <strong>座位 {seat.seat_number + 1}</strong>
              </div>
              
              <div style={{
                padding: '8px',
                backgroundColor: getSeatStatusColor(seat),
                color: 'white',
                borderRadius: '4px',
                marginBottom: '10px',
                textAlign: 'center'
              }}>
                {getSeatStatusText(seat)}
              </div>

              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {seat.status === 'empty' && (
                  <>
                    <button
                      onClick={() => handleJoinSeat(seat.seat_number)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      加入
                    </button>
                    
                    {aiTypes.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <select
                          value={selectedAiType}
                          onChange={(e) => setSelectedAiType(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        >
                          <option value="">选择AI</option>
                          {aiTypes.map(aiType => (
                            <option key={aiType.id} value={aiType.id}>
                              {aiType.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSetAISeat(seat.seat_number)}
                          disabled={!selectedAiType}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: selectedAiType ? '#2196f3' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedAiType ? 'pointer' : 'not-allowed',
                            fontSize: '12px'
                          }}
                        >
                          设置AI
                        </button>
                      </div>
                    )}
                  </>
                )}

                {seat.status === 'human' && isCurrentUserSeat(seat) && (
                  <button
                    onClick={() => handleLeaveSeat(seat.seat_number)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    离开
                  </button>
                )}

                {seat.status === 'ai' && (
                  <button
                    onClick={() => handleRemoveAISeat(seat.seat_number)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    移除AI
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          开始游戏
        </button>
      </div>
    </div>
  );
};

export default RoomDetail; 