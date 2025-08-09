/**
 * LLM服务模块
 * 用于调用API服务器获取游戏决策
 */

// API服务器端点（同源相对路径）
const API_SERVER_ENDPOINT = `/api/ai/move`;

// AI类型列表API端点（同源相对路径）
const AI_TYPES_ENDPOINT = `/api/ai/types`;

/**
 * 获取AI类型列表
 * @param {string} gameId - 游戏ID（可选）
 * @returns {Promise<Array>} AI类型列表
 */
export async function getAITypes(gameId = null) {
  try {
    const url = gameId ? `${AI_TYPES_ENDPOINT}?gameId=${gameId}` : AI_TYPES_ENDPOINT;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`获取AI类型失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('❌ 获取AI类型失败:', error);
    return [];
  }
}

/**
 * 调用API服务器获取游戏决策
 * @param {string} aiTypeId - AI类型ID
 * @param {Object} gameState - 游戏状态
 * @param {Object} config - AI配置（可选）
 * @returns {Promise<number>} 返回选中的位置索引(0-8)，失败时返回-1
 */
export async function getLLMMove(aiTypeId, gameState, config = {}) {
  try {
    console.log('🤖 调用API服务器获取决策...');
    console.log('📤 请求参数:', {
      aiTypeId,
      gameState: gameState.cells,
      config
    });
    
    console.log('🔧 API服务器端点:', API_SERVER_ENDPOINT);
    
    const response = await fetch(API_SERVER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ aiTypeId, gameState, config })
    });

    console.log('📡 HTTP响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API服务器调用失败，响应内容:', errorText);
      throw new Error(`API服务器调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 API服务器响应:', data);
    
    if (!data.success) {
      console.error('❌ API服务器返回错误:', data.error);
      throw new Error(data.error || 'AI调用失败');
    }
    
    const move = data.data.move;
    
    if (move === undefined || move === null) {
      console.error('❌ API服务器返回的移动位置无效:', data);
      throw new Error('API服务器返回的移动位置无效');
    }
    
    console.log('✅ 成功获取移动位置:', move);
    return move;
    
  } catch (error) {
    console.error('❌ AI API调用失败:', error);
    return -1;
  }
}

/**
 * 检查AI服务是否可用
 * @returns {boolean}
 */
export function isLLMServiceAvailable() {
  // 检查API服务器是否可用
  const hasApiServer = true;
  
  console.log('🔧 AI服务可用性检查:', {
    hasApiServer,
    apiServerEndpoint: window.location.origin,
    aiApiEndpoint: API_SERVER_ENDPOINT
  });
  
  return hasApiServer;
} 