import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'user' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users`, {
        credentials: 'include' // 使用Cookie认证
      });

      const data = await response.json();
      if (data.code === 200) {
        setUsers(data.data.users);
      } else {
        setError(data.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(`/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(createForm)
      });

      const data = await response.json();
      if (data.code === 200) {
        setShowCreateForm(false);
        setCreateForm({ username: '', password: '', role: 'user' });
        fetchUsers();
        setError('');
      } else {
        setError(data.message || '创建用户失败');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      setError('网络错误，请稍后重试');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({ username: user.username, role: user.role });
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.code === 200) {
        setEditingUser(null);
        fetchUsers();
        setError('');
      } else {
        setError(data.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      setError('网络错误，请稍后重试');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.code === 200) {
        fetchUsers();
        setError('');
      } else {
        setError(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      setError('网络错误，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          🔄 正在加载用户列表...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 错误提示 */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {/* 创建用户按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowCreateForm(true)}
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
          ➕ 创建新用户
        </button>
      </div>

      {/* 创建用户表单 */}
      {showCreateForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>创建新用户</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="用户名"
              value={createForm.username}
              onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="password"
              placeholder="密码"
              value={createForm.password}
              onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
            <button
              onClick={handleCreateUser}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              创建
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm({ username: '', password: '', role: 'user' });
              }}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>ID</th>
              <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>用户名</th>
              <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>角色</th>
              <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>创建时间</th>
              <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                <td style={{ padding: '15px' }}>{user.id}</td>
                <td style={{ padding: '15px' }}>
                  {editingUser && editingUser.id === user.id ? (
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      style={{
                        padding: '5px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    user.username
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  {editingUser && editingUser.id === user.id ? (
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                      style={{
                        padding: '5px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  ) : (
                    <span style={{
                      backgroundColor: user.role === 'admin' ? '#dc3545' : '#28a745',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </td>
                <td style={{ padding: '15px' }}>
                  {editingUser && editingUser.id === user.id ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={handleSave}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement; 