import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from './MessageToast';
import OnlinePlayers from './OnlinePlayers';

const NewEnhancedLobby = ({ onGameStart }) => {
  // Toast消息系统
  const { success, error, info, warning, ToastContainer } = useToast();

  // 状态管理
  const [matches, setMatches] = useState([]);
  const [games, setGames] = useState([]);
  const [aiTypes, setAiTypes] = useState([]); // 预设AI已废弃，保留状态以兼容旧代码但不再使用
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

  // 检查playing状态的match是否已结束
  const checkPlayingMatches = async (playingMatches) => {
    try {
      let hasFinishedGames = false;
      for (const match of playingMatches) {
        try {
          const response = await api.checkGameStatus(match.id);
          if (response.code === 200 && response.data?.status === 'finished') {
            console.log(`Match ${match.id} 已结束:`, response.data.gameResult);
            info(`游戏 ${match.id.substring(0, 8)}... 已结束！`);
            hasFinishedGames = true;
          }
        } catch (error) {
          // 单个match检查失败不影响其他的
          console.error(`检查match ${match.id} 状态失败:`, error);
        }
      }
      
      // 如果有游戏结束，延迟1秒后重新获取数据以显示最新状态
      if (hasFinishedGames) {
        setTimeout(() => {
          console.log('检测到游戏结束，重新获取match列表');
          fetchData();
        }, 1000);
      }
    } catch (error) {
      console.error('检查playing matches失败:', error);
    }
  };

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
        api.getAITypes(selectedGame), // 后端已返回空数组
        api.getMatches({ gameId: selectedGame })
      ]);

      if (gamesResponse.code === 200) {
        setGames(gamesResponse.data);
      }

      if (aiTypesResponse.code === 200) {
        setAiTypes(aiTypesResponse.data);
      }

      if (matchesResponse.code === 200) {
        console.log('🔍 获取到的matches响应:', matchesResponse);
        console.log('🎯 matches数据:', matchesResponse.data);
        console.log('📊 matches数量:', matchesResponse.data.length);
        setMatches(matchesResponse.data);
        
        // 自动检查所有playing状态的match，看是否需要更新为finished状态
        const playingMatches = matchesResponse.data.filter(match => match.status === 'playing');
        if (playingMatches.length > 0) {
          checkPlayingMatches(playingMatches);
        }
      } else {
        console.error('❌ 获取matches失败:', matchesResponse);
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
        success('成功加入游戏！请等待其他玩家加入或创建者开始游戏');
        // 刷新match列表，显示最新状态
        await fetchData();
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
    const confirmed = window.confirm('确定要删除这个Match吗？');
    if (!confirmed) return;

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
      // 获取当前match信息进行验证
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        error('找不到该Match');
        return;
      }

      // 验证玩家数量
      if (match.currentPlayerCount < match.min_players) {
        error(`玩家数量不足！当前 ${match.currentPlayerCount} 人，至少需要 ${match.min_players} 人才能开始游戏`);
        return;
      }

      // 验证match状态
      if (match.status !== 'waiting') {
        error('只有等待中的Match才能开始游戏');
        return;
      }

      // 验证是否是创建者
      if (!isCreator(match)) {
        error('只有创建者可以开始游戏');
        return;
      }

      const response = await api.startMatch(matchId);

      if (response.code === 200) {
        console.log('游戏开始');
        success('游戏开始！所有玩家现在可以进入游戏了');
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
    return match.players?.find(p => 
      p.playerType === 'human' && 
      (p.userName === currentUser.username || p.playerName === currentUser.username)
    );
  };

  // 检查是否是创建者
  const isCreator = (match) => {
    return currentUser && match.creator_id === currentUser.id;
  };

  // 预设AI已废弃：不再渲染预设AI选择器

  // 处理点击空座位
  const handleSeatClick = async (matchId, seatIndex) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || match.status !== 'waiting') return;

    const playerInMatch = getPlayerInMatch(match);
    const isMatchCreator = isCreator(match);
    
    // 构建选项列表
    let options = [];
    
    // 如果玩家还没有在比赛中，可以加入
    if (!playerInMatch) {
      options.push('👤 我要加入');
    }
    
    // 如果是创建者，可以添加AI（无论自己是否已在比赛中）
    if (isMatchCreator) {
      options.push('🤖 添加AI');
    }
    
    // 如果没有可用选项
    if (options.length === 0) {
      if (playerInMatch) {
        warning('您已经在此比赛中了，无法再次加入');
      } else {
        warning('您没有权限操作此座位');
      }
      return;
    }
    
    // 使用简单的选择对话框
    const choice = window.prompt(
      `选择操作 (座位 ${seatIndex + 1}):\n` + 
      options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n') + 
      '\n\n请输入序号:',
      '1'
    );
    
    if (!choice) return; // 用户取消
    
    const choiceIndex = parseInt(choice, 10) - 1;
    
    if (choiceIndex < 0 || choiceIndex >= options.length) {
      warning('无效的选择');
      return;
    }
    
    const selectedOption = options[choiceIndex];
    
    if (selectedOption === '👤 我要加入') {
      // 玩家自己加入
      await joinAsHumanWithSeat(matchId, seatIndex);
    } else if (selectedOption === '🤖 添加AI') {
      // 添加AI
      await addOnlineAIToMatchWithSeat(matchId, seatIndex);
    }
  };

  // 加入指定座位作为人类玩家
  const joinAsHumanWithSeat = async (matchId, seatIndex) => {
    try {
      const response = await api.addPlayerToMatch(matchId, {
        playerType: 'human',
        playerName: currentUser?.username,
        seatIndex: seatIndex
      });

      if (response.code === 200) {
        console.log('加入成功:', response.data);
        success(`成功加入座位 ${seatIndex + 1}！`);
        await fetchData();
      } else {
        error(`加入失败: ${response.message}`);
      }
    } catch (error) {
      console.error('加入match失败:', error);
      error('加入失败，请检查网络连接');
    }
  };

  // 添加AI到指定座位
  const addOnlineAIToMatchWithSeat = async (matchId, seatIndex) => {
    try {
      // 获取在线AI列表
      const aiListResp = await fetch(`${process.env.REACT_APP_API_SERVER || 'https://192.168.1.156'}/ai-manager/api/clients`, { credentials: 'include' });
      const aiListData = await aiListResp.json();
      if (aiListData.code !== 200) {
        error('获取AI客户端列表失败');
        return;
      }
      const clients = (aiListData.data || []).filter(c => c.status === 'connected');
      if (clients.length === 0) {
        warning('没有在线AI客户端');
        return;
      }

      // 优先选择空闲(lobby)的AI，其次让用户选择
      let client = clients.find(c => !c.matchId || c.matchId === 'lobby') || clients[0];

      if (clients.length > 1) {
        const names = clients.map((c, idx) => `${idx + 1}. ${c.playerName}${(!c.matchId || c.matchId === 'lobby') ? ' (空闲)' : ''}`).join('\n');
        const input = window.prompt(`选择要加入的在线AI编号:\n${names}`, '1');
        const index = parseInt(input, 10) - 1;
        if (!Number.isNaN(index) && clients[index]) {
          client = clients[index];
        }
      }

      // 调用AI Manager分配到match
      await fetch(`${process.env.REACT_APP_API_SERVER || 'https://192.168.1.156'}/ai-manager/api/clients/${client.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, gameType: selectedGame }),
        credentials: 'include'
      });

      // 在我们的API中添加AI玩家到指定座位
      const resp = await api.addPlayerToMatch(matchId, {
        playerType: 'ai',
        seatIndex: seatIndex,
        aiConfig: { clientId: client.id, playerName: client.playerName }
      });

      if (resp.code === 200) {
        success(`已添加AI ${client.playerName} 到座位 ${seatIndex + 1}`);
        await fetchData();
      } else {
        error(`添加AI失败: ${resp.message}`);
      }
    } catch (e) {
      console.error(e);
      error('添加AI失败');
    }
  };

  // 添加在线AI客户端到Match
  const addOnlineAIToMatch = async (matchId) => {
    try {
      // 获取在线AI列表
      const aiListResp = await fetch(`${process.env.REACT_APP_API_SERVER || 'https://192.168.1.156'}/ai-manager/api/clients`, { credentials: 'include' });
      const aiListData = await aiListResp.json();
      if (aiListData.code !== 200) {
        error('获取AI客户端列表失败');
        return;
      }
      const clients = (aiListData.data || []).filter(c => c.status === 'connected');
      if (clients.length === 0) {
        warning('没有在线AI客户端');
        return;
      }

      // 优先选择空闲(lobby)的AI，其次让用户选择
      let client = clients.find(c => !c.matchId || c.matchId === 'lobby') || clients[0];

      if (clients.length > 1) {
        const names = clients.map((c, idx) => `${idx + 1}. ${c.playerName}${(!c.matchId || c.matchId === 'lobby') ? ' (空闲)' : ''}`).join('\n');
        const input = window.prompt(`选择要加入的在线AI编号:\n${names}`, '1');
        const index = parseInt(input, 10) - 1;
        if (!Number.isNaN(index) && clients[index]) {
          client = clients[index];
        }
      }

      // 调用AI Manager分配到match
      await fetch(`${process.env.REACT_APP_API_SERVER || 'https://192.168.1.156'}/ai-manager/api/clients/${client.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, gameType: selectedGame }),
        credentials: 'include'
      });

      // 计算应使用的seatIndex：优先使用AI客户端的playerID（boardgame.io座位号）
      const aiSeatIndex = Number.isInteger(parseInt(client.playerID, 10)) ? parseInt(client.playerID, 10) : 1;

      // 在我们的API中添加AI玩家占位（仅在线AI，不依赖预设AI类型）
      const resp = await api.addPlayerToMatch(matchId, {
        playerType: 'ai',
        seatIndex: aiSeatIndex,
        aiConfig: { clientId: client.id, playerName: client.playerName }
      });

      if (resp.code === 200) {
        success(`已添加在线AI: ${client.playerName}`);
        await fetchData();
      } else {
        error(`添加在线AI失败: ${resp.message}`);
      }
    } catch (e) {
      console.error(e);
      error('添加在线AI失败');
    }
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
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* 创建者按钮 */}
            {isMatchCreator && (
              <>
                {canStart && (
                  <button
                    onClick={() => startMatch(match.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
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
              </>
            )}
            
            {/* 玩家操作按钮 */}
            {playerInMatch ? (
              <button
                onClick={() => {
                  if (match.status === 'playing') {
                    // 使用boardgame.io的真实match ID，如果没有则使用我们的ID
                    const bgioMatchId = match.bgio_match_id || match.id;
                    onGameStart(bgioMatchId, playerInMatch.seatIndex.toString(), currentUser?.username, selectedGame);
                  } else {
                    warning('游戏尚未开始，请等待创建者开始游戏或等待更多玩家加入');
                  }
                }}
                disabled={match.status !== 'playing'}
                style={{
                  padding: '6px 12px',
                  backgroundColor: match.status === 'playing' ? '#007bff' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: match.status === 'playing' ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                {match.status === 'playing' ? '进入游戏' : '游戏结束'}
              </button>
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
        </div>

        {/* 座位列表 */}
        <div style={{ 
          backgroundColor: 'rgba(0,0,0,0.05)', 
          padding: '8px', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>玩家列表:</strong>
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(() => {
              // 创建座位数组
              const seats = Array(match.max_players).fill(null);
              // 填充已占用的座位
              if (match.players) {
                match.players.forEach(player => {
                  if (player.seatIndex !== undefined && player.seatIndex !== null) {
                    seats[player.seatIndex] = player;
                  }
                });
              }
              
              return seats.map((player, seatIndex) => (
                <div
                  key={seatIndex}
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: player 
                      ? (player.isAI ? '#e9ecef' : '#d4edda')
                      : (match.status === 'waiting' ? '#f8f9fa' : '#e9ecef'),
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: player 
                      ? `1px solid ${player.isAI ? '#adb5bd' : '#c3e6cb'}`
                      : (match.status === 'waiting' ? '1px dashed #6c757d' : '1px solid #dee2e6'),
                    cursor: (!player && match.status === 'waiting') ? 'pointer' : 'default',
                    minWidth: '60px',
                    justifyContent: 'center'
                  }}
                  onClick={() => {
                    if (!player && match.status === 'waiting') {
                      handleSeatClick(match.id, seatIndex);
                    }
                  }}
                  title={!player && match.status === 'waiting' ? '点击选择加入方式' : ''}
                >
                  {player ? (
                    <>
                      {player.isAI ? '🤖' : '👤'} {player.playerName}
                      {/* 显示离开按钮：玩家自己或创建者可以移除 */}
                      {(match.status === 'waiting' && (
                        (player.playerName === currentUser.username) ||   // 玩家自己
                        (isMatchCreator)                                   // 或创建者
                      )) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveMatch(match.id, player.id);
                          }}
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
                          title={player.playerName === currentUser.username ? '离开游戏' : `移除 ${player.playerName}`}
                        >
                          ×
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#6c757d', fontSize: '11px' }}>
                      {match.status === 'waiting' ? '空位' : '空'}
                    </span>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: '20px', alignItems: 'start' }}>
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
              {creating ? '创建中...' : '🎮 创建比赛'}
            </button>
          </div>
        </div>

        {/* 右侧Match列表 */}
        <div style={{ 
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          minHeight: '400px',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#495057' }}>🎮 比赛列表</h3>
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
            >🔄
            </button>
          </div>
          
          {(() => {
            console.log('🏠 渲染时matches状态:', matches);
            console.log('🔢 渲染时matches.length:', matches.length);
            return matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>暂无可用的Match</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>创建一个新的Match来开始游戏吧！</p>
              </div>
            ) : (
              <div>
                {matches.map(match => renderMatchCard(match))}
              </div>
            );
          })()}
        </div>

        {/* 最右侧在线玩家 */}
        <div style={{ 
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          height: 'fit-content'
        }}>
          <OnlinePlayers currentUser={currentUser} />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default NewEnhancedLobby