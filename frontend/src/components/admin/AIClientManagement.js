import React, { useState, useEffect } from 'react';
import { useDialog } from '../../hooks/useDialog';
import DialogRenderer from '../common/DialogRenderer';

const AIClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [llmConfigs, setLLMConfigs] = useState([]);
  const [createForm, setCreateForm] = useState({
    playerName: '',
    matchId: '',
    gameType: 'tic-tac-toe',
    aiType: 'basic',
    llmConfig: 'default'
  });

  const { dialogs, success, error, confirm } = useDialog();

  // AI客户端管理API基础URL
  const AI_MANAGER_API = '/ai-manager/api'; // 通过nginx代理到ai-manager

  useEffect(() => {
    loadData();
    loadLLMConfigs();
    
    // 定期刷新数据
    const interval = setInterval(() => {
      loadClients();
      loadStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([loadClients(), loadStats()]);
  };

  const loadClients = async () => {
    try {
      const response = await fetch(`${AI_MANAGER_API}/clients`);
      const result = await response.json();
      if (result.code === 200) {
        setClients(result.data);
      }
    } catch (error) {
      console.error('加载AI客户端失败:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${AI_MANAGER_API}/stats`);
      const result = await response.json();
      if (result.code === 200) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  const loadLLMConfigs = async () => {
    try {
      const response = await fetch(`${AI_MANAGER_API}/llm-configs`);
      const result = await response.json();
      if (result.code === 200) {
        setLLMConfigs(result.data);
      }
    } catch (error) {
      console.error('加载LLM配置失败:', error);
    }
  };

  const createClient = async () => {
    if (!createForm.playerName) {
      error('请输入玩家名称');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AI_MANAGER_API}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const result = await response.json();
      
      if (result.code === 200) {
        success('AI客户端创建成功');
        setShowCreateModal(false);
        setCreateForm({
          playerName: '',
          matchId: '',
          gameType: 'tic-tac-toe',
          aiType: 'basic',
          llmConfig: 'default'
        });
        loadData();
      } else {
        error('创建失败: ' + result.message);
      }
    } catch (err) {
      error('创建失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopClient = async (clientId) => {
    const confirmed = await confirm('确定要停止这个AI客户端吗？');
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`${AI_MANAGER_API}/clients/${clientId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.code === 200) {
        success('AI客户端已停止');
        loadData();
      } else {
        error('停止失败: ' + result.message);
      }
    } catch (err) {
      error('停止失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopAllClients = async () => {
    const confirmed = await confirm('确定要停止所有AI客户端吗？', '批量停止操作');
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`${AI_MANAGER_API}/clients`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.code === 200) {
        success('所有AI客户端已停止');
        loadData();
      } else {
        error('停止失败: ' + result.message);
      }
    } catch (err) {
      error('停止失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      // 旧状态（向后兼容）
      'running': '#27ae60',
      'stopped': '#95a5a6',
      'crashed': '#e74c3c',
      'starting': '#f39c12',
      'stopping': '#f39c12',
      // 新状态（SimpleAIClient的实际状态）
      'created': '#f39c12',
      'connecting': '#f39c12',
      'connected': '#27ae60',
      'disconnecting': '#f39c12',
      'disconnected': '#95a5a6',
      'error': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusText = (status) => {
    const statusMap = {
      // 旧状态（向后兼容）
      'running': '运行中',
      'stopped': '已停止',
      'crashed': '已崩溃',
      'starting': '启动中',
      'stopping': '停止中',
      // 新状态（SimpleAIClient的实际状态）
      'created': '已创建',
      'connecting': '连接中',
      'connected': '已连接',
      'disconnecting': '断开中',
      'disconnected': '已断开',
      'error': '错误'
    };
    return statusMap[status] || status;
  };

  const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>🤖 AI客户端管理</h2>
        <div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
            disabled={loading}
          >
            ➕ 创建AI客户端
          </button>
          <button
            onClick={stopAllClients}
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
            disabled={loading}
          >
            ⏹️ 停止所有
          </button>
          <button
            onClick={loadData}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            disabled={loading}
          >
            🔄 刷新
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '20px' 
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3498db' }}>
            {stats.totalClients || 0}
          </div>
          <div>总AI客户端</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#27ae60' }}>
            {(stats.statusCounts?.running || 0) + (stats.statusCounts?.connected || 0)}
          </div>
          <div>活跃中</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#f39c12' }}>
            {stats.llmConfigCount || 0}
          </div>
          <div>LLM配置</div>
        </div>
      </div>

      {/* AI客户端列表 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderBottom: '1px solid #eee',
          fontWeight: 'bold'
        }}>
          AI客户端列表
        </div>
        
        {clients.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            暂无AI客户端
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px', padding: '15px' }}>
            {clients.map(client => (
              <div key={client.id} style={{
                border: '1px solid #eee',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#f9f9f9'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}>
                  <div>
                    <strong style={{ fontSize: '16px' }}>
                      {client.playerName || client.id}
                    </strong>
                    <span style={{
                      marginLeft: '10px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '12px',
                      backgroundColor: getStatusColor(client.status)
                    }}>
                      {getStatusText(client.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => stopClient(client.id)}
                    style={{
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    disabled={loading || client.status === 'stopped' || client.status === 'disconnected'}
                  >
                    停止
                  </button>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div><strong>游戏类型:</strong> {client.gameType || '未指定'}</div>
                  <div><strong>AI类型:</strong> {client.aiType || '未指定'}</div>
                  <div><strong>创建时间:</strong> {formatTime(client.createdAt)}</div>
                  <div><strong>日志条数:</strong> {client.logCount || 0}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建AI客户端模态框 */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>创建AI客户端</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                玩家名称:
              </label>
              <input
                type="text"
                value={createForm.playerName}
                onChange={(e) => setCreateForm({...createForm, playerName: e.target.value})}
                placeholder="AI-Player-1"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                游戏ID (可选):
              </label>
              <input
                type="text"
                value={createForm.matchId}
                onChange={(e) => setCreateForm({...createForm, matchId: e.target.value})}
                placeholder="留空则连接到大厅"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                游戏类型:
              </label>
              <select
                value={createForm.gameType}
                onChange={(e) => setCreateForm({...createForm, gameType: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="tic-tac-toe">井字棋</option>
                <option value="connect-four">四子棋</option>
                <option value="checkers">跳棋</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                AI类型:
              </label>
              <select
                value={createForm.aiType}
                onChange={(e) => setCreateForm({...createForm, aiType: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="basic">基础AI</option>
                <option value="strategic">策略AI</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                LLM配置:
              </label>
              <select
                value={createForm.llmConfig}
                onChange={(e) => setCreateForm({...createForm, llmConfig: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                {llmConfigs.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={createClient}
                style={{
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
                disabled={loading}
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 对话框渲染器 */}
      <DialogRenderer dialogs={dialogs} />
    </div>
  );
};

export default AIClientManagement;
