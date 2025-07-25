import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const AITypeManagement = () => {
  const [types, setTypes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    provider_id: '',
    name: '',
    description: '',
    endpoint: '',
    config_schema: '{}',
    supported_games: [],
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesData, providersData] = await Promise.all([
        api.getAITypes(),
        api.getAIProviders()
      ]);
      
      if (typesData.code === 200) {
        setTypes(typesData.data);
      }
      
      if (providersData.code === 200) {
        setProviders(providersData.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        config_schema: JSON.parse(formData.config_schema),
        supported_games: formData.supported_games.filter(game => game.trim() !== '')
      };

      if (editingType) {
        // 更新AI类型
        const data = await api.updateAIType(editingType.id, submitData);
        if (data.code === 200) {
          setTypes(types.map(t => t.id === editingType.id ? data.data : t));
          setShowForm(false);
          setEditingType(null);
          setFormData({ provider_id: '', name: '', description: '', endpoint: '', config_schema: '{}', supported_games: [], status: 'active' });
        }
      } else {
        // 创建AI类型
        const data = await api.createAIType(submitData);
        if (data.code === 200) {
          setTypes([data.data, ...types]);
          setShowForm(false);
          setFormData({ provider_id: '', name: '', description: '', endpoint: '', config_schema: '{}', supported_games: [], status: 'active' });
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请检查输入数据');
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      provider_id: type.provider_id.toString(),
      name: type.name,
      description: type.description || '',
      endpoint: type.endpoint,
      config_schema: JSON.stringify(type.config_schema || {}, null, 2),
      supported_games: type.supported_games || [],
      status: type.status
    });
    setShowForm(true);
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('确定要删除这个AI类型吗？')) {
      return;
    }

    try {
      const data = await api.deleteAIType(typeId);
      if (data.code === 200) {
        setTypes(types.filter(t => t.id !== typeId));
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      if (error.response && error.response.data) {
        alert(error.response.data.message || '删除失败');
      } else {
        alert('删除失败，请稍后重试');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({ provider_id: '', name: '', description: '', endpoint: '', config_schema: '{}', supported_games: [], status: 'active' });
  };

  const addSupportedGame = () => {
    setFormData({
      ...formData,
      supported_games: [...formData.supported_games, '']
    });
  };

  const removeSupportedGame = (index) => {
    setFormData({
      ...formData,
      supported_games: formData.supported_games.filter((_, i) => i !== index)
    });
  };

  const updateSupportedGame = (index, value) => {
    const newGames = [...formData.supported_games];
    newGames[index] = value;
    setFormData({
      ...formData,
      supported_games: newGames
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          🔄 正在加载AI类型列表...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>AI类型管理</h2>
        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ➕ 添加AI类型
        </button>
      </div>

      {/* 表单 */}
      {showForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
            {editingType ? '编辑AI类型' : '添加AI类型'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  提供商 *
                </label>
                <select
                  value={formData.provider_id}
                  onChange={(e) => setFormData({...formData, provider_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  required
                >
                  <option value="">选择提供商</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  AI类型名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="请输入AI类型名称"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '60px',
                  resize: 'vertical'
                }}
                placeholder="请输入AI类型描述"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                端点URL *
              </label>
              <input
                type="url"
                value={formData.endpoint}
                onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="https://api.example.com/ai/generate"
                required
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                配置Schema (JSON)
              </label>
              <textarea
                value={formData.config_schema}
                onChange={(e) => setFormData({...formData, config_schema: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
                placeholder='{"api_key": "string", "model": "string"}'
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                支持的游戏
              </label>
              {formData.supported_games.map((game, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                  <input
                    type="text"
                    value={game}
                    onChange={(e) => updateSupportedGame(index, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    placeholder="游戏ID，如: tic-tac-toe"
                  />
                  <button
                    type="button"
                    onClick={() => removeSupportedGame(index)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSupportedGame}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ➕ 添加游戏
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {editingType ? '更新' : '创建'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI类型列表 */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {types.map(type => (
          <div
            key={type.id}
            style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: '0 10px 0 0', color: '#495057' }}>
                    {type.name}
                  </h3>
                  <span style={{
                    backgroundColor: type.status === 'active' ? '#28a745' : '#dc3545',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {type.status === 'active' ? '启用' : '禁用'}
                  </span>
                </div>
                
                <div style={{ marginBottom: '10px', fontSize: '14px', color: '#6c757d' }}>
                  <strong>提供商:</strong> {type.provider_name || '未知'}
                </div>
                
                {type.description && (
                  <p style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '14px' }}>
                    {type.description}
                  </p>
                )}
                
                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#6c757d' }}>
                  <strong>端点:</strong> {type.endpoint}
                </div>
                
                {type.supported_games && type.supported_games.length > 0 && (
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#6c757d' }}>
                    <strong>支持的游戏:</strong> {type.supported_games.join(', ')}
                  </div>
                )}
                
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  创建时间: {new Date(type.created_at).toLocaleString()}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleEdit(type)}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {types.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          暂无AI类型，点击"添加AI类型"开始创建
        </div>
      )}
    </div>
  );
};

export default AITypeManagement; 