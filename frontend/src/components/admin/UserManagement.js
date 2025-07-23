import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', role: 'user' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_SERVER || 'http://localhost:8001'}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.code === 200) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({ username: user.username, role: user.role });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_SERVER || 'http://localhost:8001'}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.code === 200) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert('更新失败: ' + data.message);
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('更新失败');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_SERVER || 'http://localhost:8001'}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.code === 200) {
        fetchUsers();
      } else {
        alert('删除失败: ' + data.message);
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除失败');
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
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>用户管理</h2>
      
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
              <tr key={user.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                <td style={{ padding: '15px' }}>{user.id}</td>
                <td style={{ padding: '15px' }}>
                  {editingUser?.id === user.id ? (
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      style={{
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        width: '150px'
                      }}
                    />
                  ) : (
                    user.username
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  {editingUser?.id === user.id ? (
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                      style={{
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '3px'
                      }}
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: user.role === 'admin' ? '#dc3545' : '#28a745',
                      color: 'white'
                    }}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  {new Date(user.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '15px' }}>
                  {editingUser?.id === user.id ? (
                    <div>
                      <button
                        onClick={handleSave}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          marginRight: '5px',
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
                    <div>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          marginRight: '5px',
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

      {/* 刷新按钮 */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={fetchUsers}
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
          🔄 刷新列表
        </button>
      </div>
    </div>
  );
};

export default UserManagement; 