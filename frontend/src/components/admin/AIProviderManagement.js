import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const AIProviderManagement = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await api.getAIProviders();
      if (data.code === 200) {
        setProviders(data.data);
      }
    } catch (error) {
      console.error('获取AI提供商列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingProvider) {
        // 更新提供商
        const data = await api.updateAIProvider(editingProvider.id, formData);
        if (data.code === 200) {
          setProviders(providers.map(p => p.id === editingProvider.id ? data.data : p));
          setShowForm(false);
          setEditingProvider(null);
          setFormData({ name: '', description: '', status: 'active' });
        }
      } else {
        // 创建提供商
        const data = await api.createAIProvider(formData);
        if (data.code === 200) {
          setProviders([data.data, ...providers]);
          setShowForm(false);
          setFormData({ name: '', description: '', status: 'active' });
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      description: provider.description || '',
      status: provider.status
    });
    setShowForm(true);
  };

  const handleDelete = async (providerId) => {
    if (!window.confirm('确定要删除这个AI提供商吗？')) {
      return;
    }

    try {
      const data = await api.deleteAIProvider(providerId);
      if (data.code === 200) {
        setProviders(providers.filter(p => p.id !== providerId));
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
    setEditingProvider(null);
    setFormData({ name: '', description: '', status: 'active' });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          🔄 正在加载AI提供商列表...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>AI提供商管理</h2>
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
          ➕ 添加提供商
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
            {editingProvider ? '编辑AI提供商' : '添加AI提供商'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                提供商名称 *
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
                placeholder="请输入提供商名称"
                required
              />
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
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="请输入提供商描述"
              />
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
                {editingProvider ? '更新' : '创建'}
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

      {/* 提供商列表 */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {providers.map(provider => (
          <div
            key={provider.id}
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
                    {provider.name}
                  </h3>
                  <span style={{
                    backgroundColor: provider.status === 'active' ? '#28a745' : '#dc3545',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {provider.status === 'active' ? '启用' : '禁用'}
                  </span>
                </div>
                
                {provider.description && (
                  <p style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '14px' }}>
                    {provider.description}
                  </p>
                )}
                
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  创建时间: {new Date(provider.created_at).toLocaleString()}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleEdit(provider)}
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
                  onClick={() => handleDelete(provider.id)}
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

      {providers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          暂无AI提供商，点击"添加提供商"开始创建
        </div>
      )}
    </div>
  );
};

export default AIProviderManagement; 