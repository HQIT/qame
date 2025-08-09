// 统一的API调用函数（同源相对路径）
export const apiCall = async (url, options = {}) => {
  const defaultOptions = {
    credentials: 'include', // 自动发送Cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  // 使用同源相对路径，交由Nginx反向代理
  const response = await fetch(`${url}`, {
    ...defaultOptions,
    ...options
  });

  return response.json();
};

// 常用的API调用方法
export const api = {
  // 通用HTTP方法
  get: (url) => apiCall(url),
  post: (url, data) => apiCall(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  put: (url, data) => apiCall(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (url) => apiCall(url, { method: 'DELETE' }),
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
  
  getAdminAITypes: (gameId) => apiCall(`/api/admin/ai-types${gameId ? `?gameId=${gameId}` : ''}`),
  createAIType: (typeData) => apiCall('/api/admin/ai-types', {
    method: 'POST',
    body: JSON.stringify(typeData)
  }),
  updateAIType: (typeId, typeData) => apiCall(`/api/admin/ai-types/${typeId}`, {
    method: 'PUT',
    body: JSON.stringify(typeData)
  }),
  deleteAIType: (typeId) => apiCall(`/api/admin/ai-types/${typeId}`, { method: 'DELETE' }),

  // 游戏相关
  getGames: () => apiCall('/api/games'),

  // Match相关
  getMatches: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/api/matches?${params}`);
  },
  createMatch: (matchData) => apiCall('/api/matches', {
    method: 'POST',
    body: JSON.stringify(matchData)
  }),
  getMatch: (matchId) => apiCall(`/api/matches/${matchId}`),
  deleteMatch: (matchId) => apiCall(`/api/matches/${matchId}`, { method: 'DELETE' }),
  addPlayerToMatch: (matchId, playerData) => apiCall(`/api/matches/${matchId}/players`, {
    method: 'POST',
    body: JSON.stringify(playerData)
  }),
  removePlayerFromMatch: (matchId, playerId) => apiCall(`/api/matches/${matchId}/players/${playerId}`, { method: 'DELETE' }),
  startMatch: (matchId) => apiCall(`/api/matches/${matchId}/start`, { method: 'POST' }),
  cancelMatch: (matchId) => apiCall(`/api/matches/${matchId}/cancel`, { method: 'POST' }),
  checkGameStatus: (matchId) => apiCall(`/api/matches/${matchId}/check-game-status`, { method: 'POST' }),
  getCredentials: (matchId) => apiCall(`/api/matches/${matchId}/credentials`),

  // 在线用户相关
  sendHeartbeat: () => apiCall('/api/online/heartbeat', { method: 'POST' }),
  getOnlineUsers: () => apiCall('/api/online/users'),
  getOnlineStats: () => apiCall('/api/online/stats'),
  setOffline: () => apiCall('/api/online/offline', { method: 'POST' })
}; 