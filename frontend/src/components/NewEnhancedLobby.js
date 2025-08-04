import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from './MessageToast';

const NewEnhancedLobby = ({ onGameStart }) => {
  // Toast消息系统
  const { success, error, info, warning, ToastContainer } = useToast();

  // 状态管理
  const [matches, setMatches] = useState([]);
  const [games, setGames] = useState([]);
  const [aiTypes, setAiTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState('tic-tac-toe');
  const [creating, setCreating] = useState(false);

  // AI配置状态
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    aiTypeId: '',
    aiTypeName: ''
  });

  // 获取数据
  useEffect(() => {
    fetchData();
  }, [selectedGame]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户信息
      const userData = sessionStorage.getItem('user');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }

      // 并行获取数据
      const [gamesResponse, aiTypesResponse, matchesResponse] = await Promise.all([
        api.getGames(),
        api.getAITypes(selectedGame),
        api.getMatches({ gameId: selectedGame })
      ]);

      if (gamesResponse.code === 200) {
        setGames(gamesResponse.data);
      }

      if (aiTypesResponse.code === 200) {
        setAiTypes(aiTypesResponse.data);
      }

      if (matchesResponse.code === 200) {
        setMatches(matchesResponse.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新Match
  const createMatch = async () => {
    try {
      setCreating(true);

      const response = await api.createMatch({
        gameType: selectedGame,
        gameConfig: {
          allowSpectators: false
        },
        isPrivate: false,
        autoStart: false
      });

      if (response.code === 200) {
        console.log('Match创建成功:', response.data);
        // 刷新match列表
        await fetchData();
        success('Match创建成功！');
      } else {
        error(`创建失败: ${response.message}`);
      }
    } catch (error) {
      console.error('创建match失败:', error);
      error('创建match失败，请检查网络连接');
    } finally {
      setCreating(false);
    }
  };

  // 加入Match作为人类玩家
  const joinAsHuman = async (matchId) => {
    try {
      const response = await api.addPlayerToMatch(matchId, {
        playerType: 'human',
        playerName: currentUser?.username
      });

      if (response.code === 200) {
        console.log('加入成功:', response.data);
        success('成功加入游戏！');
        // 进入游戏，使用boardgame.io的真实match ID
        const bgioMatchId = response.data.bgioMatchId || matchId;
        onGameStart(bgioMatchId, response.data.seatIndex.toString(), currentUser?.username, selectedGame);
      } else {
        error(`加入失败: ${response.message}`);
      }
    } catch (error) {
      console.error('加入match失败:', error);
      error('加入match失败，请检查网络连接');
    }
  };

  // 添加AI玩家
  const addAIPlayer = async (matchId, aiTypeId) => {
    try {
      const response = await api.addPlayerToMatch(matchId, {
        playerType: 'ai',
        playerId: aiTypeId.toString(),
        aiConfig: {}
      });

      if (response.code === 200) {
        console.log('AI玩家添加成功:', response.data);
        success('AI玩家添加成功！');
        // 刷新match列表
        await fetchData();
      } else {
        error(`添加AI失败: ${response.message}`);
      }
    } catch (error) {
      console.error('添加AI玩家失败:', error);
      error('添加AI玩家失败');
    }
  };

  // 离开Match
  const leaveMatch = async (matchId, playerId) => {
    try {
      const response = await api.removePlayerFromMatch(matchId, playerId);

      if (response.code === 200) {
        console.log('离开成功');
        success('成功离开Match！');
        // 刷新match列表
        await fetchData();
      } else {
        error(`离开失败: ${response.message}`);
      }
    } catch (error) {
      console.error('离开match失败:', error);
      error('离开match失败');
    }
  };

  // 删除Match
  const deleteMatch = async (matchId) => {
    if (!window.confirm('确定要删除这个Match吗？')) {
      return;
    }

    try {
      const response = await api.deleteMatch(matchId);

      if (response.code === 200) {
        console.log('删除成功');
        success('Match删除成功！');
        // 刷新match列表
        await fetchData();
      } else {
        error(`删除失败: ${response.message}`);
      }
    } catch (error) {
      console.error('删除match失败:', error);
      error('删除match失败');
    }
  };

  // 开始Match
  const startMatch = async (matchId) => {
    try {
      const response = await api.startMatch(matchId);

      if (response.code === 200) {
        console.log('游戏开始');
        success('游戏开始！');
        // 刷新match列表
        await fetchData();
      } else {
        error(`开始失败: ${response.message}`);
      }
    } catch (error) {
      console.error('开始游戏失败:', error);
      error('开始游戏失败');
    }
  };

  // 获取玩家在match中的信息
  const getPlayerInMatch = (match) => {
    if (!currentUser) return null;
    return match.players?.find(p => p.playerType === 'human' && p.userName === currentUser.username);
  };

  // 检查是否是创建者
  const isCreator = (match) => {
    return currentUser && match.creator_id === currentUser.id;
  };

  // 渲染AI类型选择器
  const renderAISelector = (matchId) => {
    if (aiTypes.length === 0) {
      return <span style={{ fontSize: '12px', color: '#666' }}>无可用AI</span>;
    }

    return (
      <select
        onChange={(e) => {
          if (e.target.value) {
            addAIPlayer(matchId, parseInt(e.target.value));
            e.target.value = ''; // 重置选择
          }
        }}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          marginLeft: '5px'
        }}
      >
        <option value="">+ 添加AI</option>
        {aiTypes.map(aiType => (
          <option key={aiType.id} value={aiType.id}>
            {aiType.name}
          </option>
        ))}
      </select>
    );
  };

  // 渲染Match卡片
  const renderMatchCard = (match) => {
    const playerInMatch = getPlayerInMatch(match);
    const isMatchCreator = isCreator(match);
    const canJoin = !playerInMatch && match.currentPlayerCount < match.max_players && match.status === 'waiting';
    const canAddAI = isMatchCreator && match.currentPlayerCount < match.max_players && match.status === 'waiting';
    const canStart = isMatchCreator && match.currentPlayerCount >= match.min_players && match.status === 'waiting';

    return (
      <div
        key={match.id}
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: playerInMatch ? '#e7f3ff' : '#f8f9fa',
          marginBottom: '12px'
        }}
      >
        {/* Match信息头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <strong>Match ID: {match.id.substring(0, 8)}...</strong>
              {playerInMatch && (
                <span style={{ 
                  marginLeft: '10px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '3px', 
                  fontSize: '11px' 
                }}>
                  我的游戏
                </span>
              )}
              {isMatchCreator && (
                <span style={{ 
                  marginLeft: '5px', 
                  backgroundColor: '#ffc107', 
                  color: '#000', 
                  padding: '2px 6px', 
                  borderRadius: '3px', 
                  fontSize: '11px' 
                }}>
                  创建者
                </span>
              )}
            </div>
            
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
              <div>状态: <span style={{ 
                color: match.status === 'waiting' ? '#007bff' : 
                      match.status === 'playing' ? '#28a745' : '#6c757d',
                fontWeight: 'bold'
              }}>
                {match.status === 'waiting' ? '等待玩家' : 
                 match.status === 'playing' ? '游戏中' : 
                 match.status === 'finished' ? '已结束' : '已取消'}
              </span></div>
              <div>玩家: {match.currentPlayerCount}/{match.max_players}</div>
              <div>创建者: {match.creator_name}</div>
              <div>创建时间: {new Date(match.created_at).toLocaleString()}</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            {/* 第一行：主要操作 */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {playerInMatch ? (
                <>
                  <button
                    onClick={() => {
                      // 使用boardgame.io的真实match ID，如果没有则使用我们的ID
                      const bgioMatchId = match.bgio_match_id || match.id;
                      onGameStart(bgioMatchId, playerInMatch.seatIndex.toString(), currentUser?.username, selectedGame);
                    }}
                    style={{
                      padding: '6px 12px',
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
                  <button
                    onClick={() => leaveMatch(match.id, playerInMatch.id)}
                    disabled={match.status === 'playing'}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: match.status === 'playing' ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: match.status === 'playing' ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    离开
                  </button>
                </>
              ) : canJoin ? (
                <button
                  onClick={() => joinAsHuman(match.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  加入游戏
                </button>
              ) : (
                <button
                  disabled
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'not-allowed',
                    fontSize: '12px'
                  }}
                >
                  {match.status !== 'waiting' ? '不可加入' : '已满员'}
                </button>
              )}
            </div>

            {/* 第二行：创建者操作 */}
            {isMatchCreator && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {canStart && (
                  <button
                    onClick={() => startMatch(match.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    开始游戏
                  </button>
                )}
                {canAddAI && renderAISelector(match.id)}
                {match.status !== 'playing' && (
                  <button
                    onClick={() => deleteMatch(match.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    删除
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 玩家列表 */}
        {match.players && match.players.length > 0 && (
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.05)', 
            padding: '8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>玩家列表:</strong>
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {match.players.map((player, index) => (
                <span 
                  key={player.id} 
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: player.isAI ? '#e9ecef' : '#d4edda',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: '1px solid ' + (player.isAI ? '#adb5bd' : '#c3e6cb')
                  }}
                >
                  {player.isAI ? '🤖' : '👤'} {player.playerName}
                  {isMatchCreator && player.isAI && match.status === 'waiting' && (
                    <button
                      onClick={() => leaveMatch(match.id, player.id)}
                      style={{
                        marginLeft: '4px',
                        padding: '0 4px',
                        fontSize: '10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>🔄 加载中...</div>
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

          {/* 游戏选择 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              选择游戏类型:
            </label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              {games.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          {/* 创建新Match */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={createMatch}
              disabled={!selectedGame || creating}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: !selectedGame || creating ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !selectedGame || creating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {creating ? '创建中...' : '🎮 创建新Match'}
            </button>
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
              <p>• 创建Match后不会自动加入</p>
              <p>• 可以选择自己加入或添加AI玩家</p>
              <p>• 创建者可以管理Match和AI玩家</p>
              <p>• 游戏未开始前可以随时离开</p>
              <p>• 人数满足要求后可开始游戏</p>
            </div>
          </div>
        </div>

        {/* 右侧Match列表 */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#495057' }}>🎮 Match列表</h3>
            <button
              onClick={fetchData}
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
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>暂无可用的Match</p>
              <p style={{ fontSize: '14px', marginTop: '10px' }}>创建一个新的Match来开始游戏吧！</p>
            </div>
          ) : (
            <div>
              {matches.map(match => renderMatchCard(match))}
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default NewEnhancedLobby;