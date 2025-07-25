// 统一的API调用函数
export const apiCall = async (url, options = {}) => {
  const defaultOptions = {
    credentials: 'include', // 自动发送Cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${process.env.REACT_APP_API_SERVER || 'http://localhost:8001'}${url}`, {
    ...defaultOptions,
    ...options
  });

  return response.json();
};

// 常用的API调用方法
export const api = {
  // 认证相关
  verify: () => apiCall('/api/auth/verify'),
  login: (credentials) => apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  logout: () => apiCall('/api/auth/logout', { method: 'POST' }),

  // 管理员相关
  getUsers: (page = 1, limit = 10) => apiCall(`/api/admin/users?page=${page}&limit=${limit}`),
  createUser: (userData) => apiCall('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  updateUser: (userId, userData) => apiCall(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  }),
  deleteUser: (userId) => apiCall(`/api/admin/users/${userId}`, { method: 'DELETE' }),
  getStats: () => apiCall('/api/admin/stats'),

  // AI相关
  getAITypes: (gameId) => apiCall(`/api/ai/types${gameId ? `?gameId=${gameId}` : ''}`),
  callAI: (aiTypeId, gameState, config) => apiCall('/api/ai/move', {
    method: 'POST',
    body: JSON.stringify({ aiTypeId, gameState, config })
  }),
  testAI: (aiTypeId) => apiCall('/api/ai/test', {
    method: 'POST',
    body: JSON.stringify({ aiTypeId })
  }),

  // AI管理相关
  getAIProviders: () => apiCall('/api/admin/ai-providers'),
  createAIProvider: (providerData) => apiCall('/api/admin/ai-providers', {
    method: 'POST',
    body: JSON.stringify(providerData)
  }),
  updateAIProvider: (providerId, providerData) => apiCall(`/api/admin/ai-providers/${providerId}`, {
    method: 'PUT',
    body: JSON.stringify(providerData)
  }),
  deleteAIProvider: (providerId) => apiCall(`/api/admin/ai-providers/${providerId}`, { method: 'DELETE' }),
  
  getAITypes: (gameId) => apiCall(`/api/admin/ai-types${gameId ? `?gameId=${gameId}` : ''}`),
  createAIType: (typeData) => apiCall('/api/admin/ai-types', {
    method: 'POST',
    body: JSON.stringify(typeData)
  }),
  updateAIType: (typeId, typeData) => apiCall(`/api/admin/ai-types/${typeId}`, {
    method: 'PUT',
    body: JSON.stringify(typeData)
  }),
  deleteAIType: (typeId) => apiCall(`/api/admin/ai-types/${typeId}`, { method: 'DELETE' })
}; 