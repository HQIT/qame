import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const CreateRoom = ({ onClose, onRoomCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    gameId: 'tic-tac-toe',
    maxPlayers: 2
  });
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('请输入房间名称');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.createRoom(formData);
      
      if (response.code === 200) {
        onRoomCreated(response.data);
      } else {
        setError(response.message || '创建房间失败');
      }
    } catch (error) {
      console.error('创建房间失败:', error);
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
        // 设置默认游戏的最大玩家数
        const defaultGame = response.data.find(g => g.id === 'tic-tac-toe');
        if (defaultGame) {
          setFormData(prev => ({
            ...prev,
            maxPlayers: defaultGame.max_players
          }));
        }
      }
    } catch (error) {
      console.error('获取游戏列表失败:', error);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 当游戏改变时，自动更新最大玩家数
    if (name === 'gameId') {
      const selectedGame = games.find(g => g.id === value);
      if (selectedGame) {
        setFormData(prev => ({
          ...prev,
          maxPlayers: selectedGame.max_players
        }));
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '400px',
        maxWidth: '90vw'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0 }}>创建新房间</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              房间名称 *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="请输入房间名称"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              游戏类型
            </label>
            <select
              name="gameId"
              value={formData.gameId}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {games.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name} ({game.min_players}-{game.max_players}人)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              最大玩家数
            </label>
            <div style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#f5f5f5',
              color: '#666'
            }}>
              {formData.maxPlayers} 人 (根据游戏自动设置)
            </div>
          </div>

          {error && (
            <div style={{
              color: 'red',
              marginBottom: '15px',
              padding: '8px',
              backgroundColor: '#ffebee',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: loading ? '#ccc' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '创建中...' : '创建房间'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom; 