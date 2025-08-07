import React, { useState, useEffect } from 'react';
import { useDialog } from '../../hooks/useDialog';
import DialogRenderer from '../common/DialogRenderer';

const AIConfigManagement = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'templates'

  const [formData, setFormData] = useState({
    // 基础信息
    name: '',
    description: '',
    type: 'custom', // 'basic', 'strategic', 'advanced', 'custom'
    
    // LLM配置
    endpoint: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 100,
    temperature: 0.7,
    systemPrompt: '你是一个聪明的游戏AI助手。请分析游戏状态并选择最佳移动。',
    
    // 能力配置
    supportedGames: ['tic-tac-toe'],
    maxComplexity: 'medium',
    maxPlayers: 4,
    maxBoardSize: 100,
    features: {
      strategicThinking: true,
      patternRecognition: true,
      longTermPlanning: false,
      realTimeDecision: true
    },
    
    // 行为配置
    minThinkTime: 1000,
    maxThinkTime: 3000,
    useFallback: true,
    validateMoves: true
  });

  const { dialogs, success, error, confirmDanger } = useDialog();

  // 预设模板
  const templates = {
    basic: {
      name: '基础AI',
      description: '适合简单游戏的AI玩家，快速响应，基础策略',
      type: 'basic',
      supportedGames: ['tic-tac-toe'],
      maxComplexity: 'simple',
      maxPlayers: 2,
      maxBoardSize: 9,
      features: {
        strategicThinking: false,
        patternRecognition: true,
        longTermPlanning: false,
        realTimeDecision: true
      },
      minThinkTime: 500,
      maxThinkTime: 1500,
      model: 'gpt-3.5-turbo',
      maxTokens: 50,
      temperature: 0.3
    },
    strategic: {
      name: '策略AI',
      description: '支持中等复杂度游戏，具备战略思维和模式识别能力',
      type: 'strategic',
      supportedGames: ['tic-tac-toe', 'connect-four', 'checkers'],
      maxComplexity: 'medium',
      maxPlayers: 4,
      maxBoardSize: 64,
      features: {
        strategicThinking: true,
        patternRecognition: true,
        longTermPlanning: false,
        realTimeDecision: true
      },
      minThinkTime: 1000,
      maxThinkTime: 3000,
      model: 'gpt-3.5-turbo',
      maxTokens: 100,
      temperature: 0.7
    },
    advanced: {
      name: '高级AI',
      description: '支持复杂游戏，具备长期规划和深度战略分析能力',
      type: 'advanced',
      supportedGames: ['tic-tac-toe', 'connect-four', 'checkers', 'chess', 'go'],
      maxComplexity: 'complex',
      maxPlayers: 4,
      maxBoardSize: 400,
      features: {
        strategicThinking: true,
        patternRecognition: true,
        longTermPlanning: true,
        realTimeDecision: true
      },
      minThinkTime: 2000,
      maxThinkTime: 5000,
      model: 'gpt-4',
      maxTokens: 200,
      temperature: 0.8
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      // 这里暂时使用现有的LLM配置API，后续需要更新为新的AI配置API
      const response = await fetch('/ai-manager/api/llm-configs');
      const result = await response.json();
      if (result.code === 200) {
        // 将现有数据映射到新格式
        const mappedConfigs = result.data.map(config => ({
          id: config.id,
          name: config.name,
          description: config.description || '自定义AI配置',
          type: 'custom',
          endpoint: config.endpoint,
          apiKey: config.apiKey,
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          systemPrompt: config.systemPrompt,
          // 默认能力配置
          supportedGames: ['tic-tac-toe'],
          maxComplexity: 'medium',
          maxPlayers: 4,
          maxBoardSize: 100,
          features: {
            strategicThinking: true,
            patternRecognition: true,
            longTermPlanning: false,
            realTimeDecision: true
          },
          minThinkTime: 1000,
          maxThinkTime: 3000,
          useFallback: true,
          validateMoves: true
        }));
        setConfigs(mappedConfigs);
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      type: 'custom',
      endpoint: '',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      maxTokens: 100,
      temperature: 0.7,
      systemPrompt: '你是一个聪明的游戏AI助手。请分析游戏状态并选择最佳移动。',
      supportedGames: ['tic-tac-toe'],
      maxComplexity: 'medium',
      maxPlayers: 4,
      maxBoardSize: 100,
      features: {
        strategicThinking: true,
        patternRecognition: true,
        longTermPlanning: false,
        realTimeDecision: true
      },
      minThinkTime: 1000,
      maxThinkTime: 3000,
      useFallback: true,
      validateMoves: true
    });
    setEditingConfig(null);
    setShowCreateModal(true);
  };

  const openEditModal = (config) => {
    setFormData({ ...config });
    setEditingConfig(config);
    setShowCreateModal(true);
  };

  const applyTemplate = (templateKey) => {
    const template = templates[templateKey];
    setFormData({
      ...formData,
      ...template,
      endpoint: formData.endpoint, // 保留现有的endpoint
      apiKey: formData.apiKey,     // 保留现有的apiKey
      systemPrompt: formData.systemPrompt || template.systemPrompt || '你是一个聪明的游戏AI助手。'
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingConfig(null);
  };

  const saveConfig = async () => {
    if (!formData.name || !formData.endpoint) {
      error('请填写配置名称和API端点');
      return;
    }

    setLoading(true);
    try {
      // 暂时使用现有API结构，后续需要更新
      const apiData = {
        name: formData.name,
        endpoint: formData.endpoint,
        apiKey: formData.apiKey,
        model: formData.model,
        maxTokens: formData.maxTokens,
        temperature: formData.temperature,
        systemPrompt: formData.systemPrompt
      };

      const url = editingConfig 
        ? `/ai-manager/api/llm-configs/${editingConfig.id}`
        : '/ai-manager/api/llm-configs';
      
      const method = editingConfig ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });
      const result = await response.json();
      
      if (result.code === 200) {
        success(editingConfig ? 'AI配置更新成功' : 'AI配置创建成功');
        closeModal();
        loadConfigs();
      } else {
        error('操作失败: ' + result.message);
      }
    } catch (err) {
      error('操作失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (configId) => {
    if (configId === 'default') {
      error('不能删除默认配置');
      return;
    }

    const confirmed = await confirmDanger('确定要删除这个AI配置吗？删除后无法恢复。');
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`/ai-manager/api/llm-configs/${configId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.code === 200) {
        success('AI配置已删除');
        loadConfigs();
      } else {
        error('删除失败: ' + result.message);
      }
    } catch (err) {
      error('删除失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      basic: '#27ae60',
      strategic: '#3498db', 
      advanced: '#9b59b6',
      custom: '#f39c12'
    };
    return colors[type] || '#95a5a6';
  };

  const getTypeName = (type) => {
    const names = {
      basic: '基础',
      strategic: '策略',
      advanced: '高级',
      custom: '自定义'
    };
    return names[type] || '未知';
  };

  const getComplexityColor = (complexity) => {
    const colors = {
      simple: '#27ae60',
      medium: '#f39c12',
      complex: '#e74c3c'
    };
    return colors[complexity] || '#95a5a6';
  };

  const toggleFeature = (feature) => {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [feature]: !formData.features[feature]
      }
    });
  };

  const toggleGameSupport = (game) => {
    const supported = formData.supportedGames.includes(game);
    if (supported) {
      setFormData({
        ...formData,
        supportedGames: formData.supportedGames.filter(g => g !== game)
      });
    } else {
      setFormData({
        ...formData,
        supportedGames: [...formData.supportedGames, game]
      });
    }
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>🤖 AI配置管理</h2>
        <div>
          <button
            onClick={openCreateModal}
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
            ➕ 创建AI配置
          </button>
          <button
            onClick={loadConfigs}
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

      {/* 标签页切换 */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #eee',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'list' ? '#3498db' : 'transparent',
            color: activeTab === 'list' ? 'white' : '#666',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0'
          }}
        >
          📋 配置列表
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'templates' ? '#3498db' : 'transparent',
            color: activeTab === 'templates' ? 'white' : '#666',
            cursor: 'pointer',
            borderRadius: '5px 5px 0 0',
            marginLeft: '5px'
          }}
        >
          📝 预设模板
        </button>
      </div>

      {/* 配置列表 */}
      {activeTab === 'list' && (
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
            AI配置列表 ({configs.length})
          </div>
          
          {configs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🤖</div>
              <div>暂无AI配置</div>
              <div style={{ fontSize: '14px', marginTop: '5px' }}>
                点击"创建AI配置"开始配置您的AI助手
              </div>
            </div>
          ) : (
            <div style={{ padding: '15px' }}>
              {configs.map(config => (
                <div key={config.id} style={{
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '15px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '18px', color: '#2c3e50', marginRight: '10px' }}>
                          {config.name}
                        </strong>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '12px',
                          backgroundColor: getTypeColor(config.type)
                        }}>
                          {getTypeName(config.type)}
                        </span>
                        {config.id === 'default' && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '11px',
                            backgroundColor: '#3498db'
                          }}>
                            默认
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#666', marginBottom: '10px', fontSize: '14px' }}>
                        {config.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditModal(config)}
                        style={{
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        disabled={loading}
                      >
                        编辑
                      </button>
                      {config.id !== 'default' && (
                        <button
                          onClick={() => deleteConfig(config.id)}
                          style={{
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          disabled={loading}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* 配置详情 */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '15px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <div>
                      <div><strong>API端点:</strong> {config.endpoint}</div>
                      <div><strong>模型:</strong> {config.model}</div>
                      <div><strong>最大复杂度:</strong> 
                        <span style={{
                          marginLeft: '5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '11px',
                          backgroundColor: getComplexityColor(config.maxComplexity)
                        }}>
                          {config.maxComplexity}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div><strong>支持游戏:</strong> {config.supportedGames?.join(', ') || 'N/A'}</div>
                      <div><strong>最大玩家:</strong> {config.maxPlayers}</div>
                      <div><strong>API密钥:</strong> {config.apiKey ? '已配置' : '未配置'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 预设模板 */}
      {activeTab === 'templates' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2c3e50' }}>
            📝 预设模板
          </h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            选择预设模板快速创建AI配置，每个模板针对不同的使用场景进行了优化。
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px' 
          }}>
            {Object.entries(templates).map(([key, template]) => (
              <div key={key} style={{
                border: '2px solid #eee',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#f9f9f9',
                transition: 'border-color 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = getTypeColor(template.type)}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#eee'}
              onClick={() => {
                applyTemplate(key);
                openCreateModal();
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '16px', color: '#2c3e50', marginRight: '10px' }}>
                    {template.name}
                  </strong>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                    backgroundColor: getTypeColor(template.type)
                  }}>
                    {getTypeName(template.type)}
                  </span>
                </div>
                <div style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                  {template.description}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                  <div>支持游戏: {template.supportedGames.join(', ')}</div>
                  <div>复杂度: {template.maxComplexity}</div>
                  <div>思考时间: {template.minThinkTime}-{template.maxThinkTime}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 创建/编辑模态框 */}
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
            borderRadius: '8px',
            width: '800px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* 模态框标题 */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px 8px 0 0'
            }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>
                {editingConfig ? '编辑AI配置' : '创建AI配置'}
              </h3>
            </div>

            <div style={{ padding: '20px' }}>
              {/* 基础信息 */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>📝 基础信息</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      配置名称:
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="我的AI配置"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      AI类型:
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="basic">基础AI</option>
                      <option value="strategic">策略AI</option>
                      <option value="advanced">高级AI</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    描述:
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="描述这个AI的特点和用途..."
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* 快速模板选择 */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    快速应用模板:
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {Object.entries(templates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => applyTemplate(key)}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid ' + getTypeColor(template.type),
                          backgroundColor: formData.type === key ? getTypeColor(template.type) : 'white',
                          color: formData.type === key ? 'white' : getTypeColor(template.type),
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* LLM配置 */}
              <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>🔧 LLM配置</h4>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    API端点:
                  </label>
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                    placeholder="http://localhost:3001/api/move"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      API密钥:
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                      placeholder="sk-..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      模型名称:
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      placeholder="gpt-3.5-turbo"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      最大Token数:
                    </label>
                    <input
                      type="number"
                      value={formData.maxTokens}
                      onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value)})}
                      min="10"
                      max="1000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      温度参数:
                    </label>
                    <input
                      type="number"
                      value={formData.temperature}
                      onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                      min="0"
                      max="2"
                      step="0.1"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    系统提示词:
                  </label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
                    rows="3"
                    placeholder="你是一个聪明的游戏AI助手..."
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* 能力配置 */}
              <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>🎯 能力配置</h4>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    支持的游戏:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {['tic-tac-toe', 'connect-four', 'checkers', 'chess', 'go'].map(game => (
                      <button
                        key={game}
                        onClick={() => toggleGameSupport(game)}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid #ddd',
                          backgroundColor: formData.supportedGames.includes(game) ? '#3498db' : 'white',
                          color: formData.supportedGames.includes(game) ? 'white' : '#666',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {game}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      最大复杂度:
                    </label>
                    <select
                      value={formData.maxComplexity}
                      onChange={(e) => setFormData({...formData, maxComplexity: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="simple">简单</option>
                      <option value="medium">中等</option>
                      <option value="complex">复杂</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      最大玩家数:
                    </label>
                    <input
                      type="number"
                      value={formData.maxPlayers}
                      onChange={(e) => setFormData({...formData, maxPlayers: parseInt(e.target.value)})}
                      min="2"
                      max="8"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      最大棋盘大小:
                    </label>
                    <input
                      type="number"
                      value={formData.maxBoardSize}
                      onChange={(e) => setFormData({...formData, maxBoardSize: parseInt(e.target.value)})}
                      min="9"
                      max="1000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    AI特性:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {Object.entries(formData.features).map(([feature, enabled]) => (
                      <label key={feature} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleFeature(feature)}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ fontSize: '14px' }}>
                          {feature === 'strategicThinking' && '策略思维'}
                          {feature === 'patternRecognition' && '模式识别'}
                          {feature === 'longTermPlanning' && '长期规划'}
                          {feature === 'realTimeDecision' && '实时决策'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      最小思考时间(ms):
                    </label>
                    <input
                      type="number"
                      value={formData.minThinkTime}
                      onChange={(e) => setFormData({...formData, minThinkTime: parseInt(e.target.value)})}
                      min="100"
                      max="10000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      最大思考时间(ms):
                    </label>
                    <input
                      type="number"
                      value={formData.maxThinkTime}
                      onChange={(e) => setFormData({...formData, maxThinkTime: parseInt(e.target.value)})}
                      min="100"
                      max="10000"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 按钮区域 */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #eee',
              backgroundColor: '#f8f9fa',
              borderRadius: '0 0 8px 8px',
              textAlign: 'right'
            }}>
              <button
                onClick={closeModal}
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
                onClick={saveConfig}
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
                {loading ? '保存中...' : '保存'}
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

export default AIConfigManagement;
