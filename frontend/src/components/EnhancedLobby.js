import React, { useState, useEffect } from 'react';
import { Lobby } from 'boardgame.io/react';
import TicTacToe from '../games/TicTacToe';
import TicTacToeBoard from '../games/TicTacToeBoard';
import { api } from '../utils/api';

// 自定义Lobby组件，隐藏player name输入框
const CustomLobby = ({ gameServer, lobbyServer, gameComponents, playerName, selectedGame, aiConfig, onGameStart }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingMatch, setCreatingMatch] = useState(false);

  const fetchMatches = async () => {
    try {
      // 构建正确的lobby URL
      const baseUrl = lobbyServer.replace('/games', '');
      const lobbyUrl = `${baseUrl}/games/${selectedGame}`;
      
      console.log('获取matches URL:', lobbyUrl);
      
      const response = await fetch(lobbyUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('获取到的matches:', data);
        setMatches(data.matches || []);
      } else {
        console.error('获取matches失败:', response.status);
      }
    } catch (error) {
      console.error('获取matches失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [lobbyServer, selectedGame]);

  const createMatch = async () => {
    if (!selectedGame) {
      alert('请先选择游戏类型');
      return;
    }

    try {
      setCreatingMatch(true);
      
      // 构建正确的URL
      const baseUrl = gameServer.replace('/games', ''); // 移除可能的重复路径
      const createUrl = `${baseUrl}/games/${selectedGame}/create`;
      
      console.log('创建match URL:', createUrl);
      
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numPlayers: 2,
          setupData: {
            aiConfig: aiConfig.enabled ? aiConfig : null
          }
        })
      });

      if (response.ok) {
        const matchData = await response.json();
        console.log('Match创建成功:', matchData);
        
        // 自动加入match作为第一个玩家
        await joinMatch(matchData.matchID, '0');
        
        // 刷新match列表
        const baseUrl = lobbyServer.replace('/games', '');
        const matchesResponse = await fetch(`${baseUrl}/games/${selectedGame}`);
        if (matchesResponse.ok) {
          const data = await matchesResponse.json();
          console.log('刷新后的matches:', data);
          setMatches(data.matches || []);
        } else {
          console.error('刷新matches失败:', matchesResponse.status);
        }
        
        alert('Match创建成功！您已自动加入游戏。');
      } else {
        const errorText = await response.text();
        console.error('创建match失败:', response.status, errorText);
        alert(`创建match失败: ${response.status}`);
      }
    } catch (error) {
      console.error('创建match失败:', error);
      alert('创建match失败，请检查网络连接');
    } finally {
      setCreatingMatch(false);
    }
  };

  const joinMatch = async (matchID, playerID) => {
    try {
      const baseUrl = gameServer.replace('/games', '');
      const joinUrl = `${baseUrl}/games/${selectedGame}/${matchID}/join`;
      
      console.log('加入match URL:', joinUrl);
      
      const response = await fetch(joinUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerID,
          playerName
        })
      });

      if (response.ok) {
        // 调用游戏开始回调
        if (onGameStart) {
          onGameStart(matchID, playerID, playerName, selectedGame);
        }
      } else {
        const errorText = await response.text();
        console.error('加入match失败:', response.status, errorText);
        alert(`加入match失败: ${response.status}`);
      }
    } catch (error) {
      console.error('加入match失败:', error);
      alert('加入match失败，请检查网络连接');
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      {/* 游戏选择 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          选择游戏类型:
        </label>
        <select
          value={selectedGame}
          onChange={(e) => {
            // 这里需要通过props传递回调函数
            if (window.onGameSelect) {
              window.onGameSelect(e.target.value);
            }
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '10px'
          }}
        >
          <option value="">请选择游戏</option>
          <option value="tic-tac-toe">井字棋</option>
        </select>
      </div>

      {/* 创建新match按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={createMatch}
          disabled={!selectedGame || creatingMatch}
          style={{
            padding: '10px 20px',
            backgroundColor: !selectedGame || creatingMatch ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !selectedGame || creatingMatch ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: !selectedGame || creatingMatch ? 0.6 : 1
          }}
        >
          {creatingMatch ? '创建中...' : '🎮 创建新Match'}
        </button>
      </div>

      {/* Match列表 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4>可加入的Matches:</h4>
          <button
            onClick={() => {
              setLoading(true);
              fetchMatches();
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔄 刷新
          </button>
        </div>
        {matches.length === 0 ? (
          <div>
            <p style={{ color: '#666', fontStyle: 'italic' }}>暂无可加入的match</p>
            <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
              调试信息: 游戏类型={selectedGame}, 服务器={lobbyServer}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {matches.map((match) => {
              const playerCount = match.players?.length || 0;
              const isFull = playerCount >= 2;
              const currentUserInMatch = match.players?.some(p => p.name === playerName);
              
              return (
                <div
                  key={match.matchID}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '15px',
                    backgroundColor: currentUserInMatch ? '#e7f3ff' : '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <strong>Match ID: {match.matchID}</strong>
                        {currentUserInMatch && (
                          <span style={{ 
                            marginLeft: '10px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '3px', 
                            fontSize: '10px' 
                          }}>
                            我的游戏
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <div>玩家: {playerCount}/2</div>
                        <div>创建时间: {new Date(match.createdAt).toLocaleString()}</div>
                        {match.players && match.players.length > 0 && (
                          <div>玩家列表: {match.players.map(p => p.name || '未命名').join(', ')}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {currentUserInMatch ? (
                        <button
                          onClick={() => {
                            // 找到当前用户在match中的位置
                            const playerIndex = match.players?.findIndex(p => p.name === playerName) ?? 0;
                            onGameStart(match.matchID, playerIndex.toString(), playerName, selectedGame);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          进入游戏
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // 找到第一个空位
                            const emptySeat = match.players?.findIndex(p => !p.name) ?? 0;
                            joinMatch(match.matchID, emptySeat.toString());
                          }}
                          disabled={isFull}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: isFull ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {isFull ? '已满员' : '加入'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const EnhancedLobby = ({ onGameStart }) => {
  // AI配置状态
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    aiTypeId: '',
    aiTypeName: ''
  });

  // 游戏列表和AI类型
  const [games, setGames] = useState([]);
  const [aiTypes, setAiTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState('tic-tac-toe');

  // 获取游戏列表和AI类型
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 获取当前用户信息
        const userData = sessionStorage.getItem('user');
        if (userData) {
          setCurrentUser(JSON.parse(userData));
        }
        
        // 获取游戏列表
        const gamesResponse = await api.getGames();
        if (gamesResponse.code === 200) {
          setGames(gamesResponse.data);
        }

        // 获取AI类型
        const aiTypesResponse = await api.getAITypes('tic-tac-toe');
        if (aiTypesResponse.code === 200) {
          setAiTypes(aiTypesResponse.data);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 处理AI配置变化
  const handleAIConfigChange = (field, value) => {
    setAiConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理游戏选择变化
  const handleGameSelect = (gameId) => {
    setSelectedGame(gameId);
  };

  // 生成Lobby的setupData
  const getSetupData = () => {
    const setupData = {
      aiConfig: aiConfig.enabled ? aiConfig : null
    };
    return setupData;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>🎮 游戏大厅</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* 左侧配置面板 */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          height: 'fit-content'
        }}>
          {/* 用户信息 */}
          {currentUser && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '6px' }}>
              <h4 style={{ marginBottom: '10px', color: '#0056b3' }}>👤 当前用户</h4>
              <p style={{ margin: '0', fontSize: '14px' }}>
                <strong>用户名:</strong> {currentUser.username}
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                <strong>角色:</strong> {currentUser.role === 'admin' ? '管理员' : '用户'}
              </p>
            </div>
          )}

          {/* AI配置 */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: '#495057' }}>🤖 AI配置</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aiConfig.enabled}
                  onChange={(e) => handleAIConfigChange('enabled', e.target.checked)}
                  style={{ marginRight: '8px', transform: 'scale(1.1)' }}
                />
                <span>启用AI玩家</span>
              </label>
            </div>

            {aiConfig.enabled && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  AI类型
                </label>
                <select
                  value={aiConfig.aiTypeId}
                  onChange={(e) => {
                    const selectedType = aiTypes.find(type => type.id.toString() === e.target.value);
                    handleAIConfigChange('aiTypeId', e.target.value);
                    handleAIConfigChange('aiTypeName', selectedType?.name || '');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">选择AI类型</option>
                  {aiTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 使用说明 */}
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            padding: '15px', 
            borderRadius: '6px',
            border: '1px solid #b3d9ff'
          }}>
            <h4 style={{ marginBottom: '10px', color: '#0056b3' }}>💡 使用说明</h4>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
              <p>• 选择游戏类型（目前支持井字棋）</p>
              <p>• 点击"创建新Match"创建游戏房间</p>
              <p>• 或加入现有的match进行游戏</p>
              <p>• 可选择启用AI玩家进行人机对战</p>
              <p>• 游戏结束后可重新开始</p>
            </div>
          </div>
        </div>

        {/* 右侧Lobby区域 */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>🎮 Match列表</h3>
          
          <CustomLobby
            gameServer={process.env.REACT_APP_SERVER || "http://localhost:8000"}
            lobbyServer={process.env.REACT_APP_SERVER || "http://localhost:8000"}
            gameComponents={[
              { 
                game: TicTacToe, 
                board: (props) => (
                  <TicTacToeBoard 
                    {...props} 
                    enableAI={aiConfig.enabled}
                    aiType={aiConfig.aiTypeName}
                    setupData={getSetupData()}
                  />
                )
              }
            ]}
            playerName={currentUser?.username || 'Anonymous'}
            selectedGame={selectedGame}
            aiConfig={aiConfig}
            onGameStart={onGameStart}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedLobby; 