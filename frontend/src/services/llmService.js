/**
 * LLM服务模块
 * 用于调用后端LLM API获取游戏决策
 */

// 后端LLM API端点
const LLM_API_ENDPOINT = process.env.REACT_APP_SERVER 
  ? `${process.env.REACT_APP_SERVER.replace(':8000', ':8001')}/api/llm/move`
  : 'http://localhost:8001/api/llm/move';

/**
 * 调用后端LLM API获取游戏决策
 * @param {string} prompt - 发送给LLM的提示词
 * @returns {Promise<number>} 返回选中的位置索引(0-8)，失败时返回-1
 */
export async function getLLMMove(prompt) {
  try {
    console.log('🤖 调用后端LLM API获取决策...');
    console.log('📤 发送的提示词:');
    console.log('='.repeat(50));
    console.log(prompt);
    console.log('='.repeat(50));
    
    console.log('🔧 后端API端点:', LLM_API_ENDPOINT);
    
    const response = await fetch(LLM_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    console.log('📡 HTTP响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 后端API调用失败，响应内容:', errorText);
      throw new Error(`后端API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 后端API响应:', data);
    
    if (data.error) {
      console.error('❌ 后端返回错误:', data.error);
      throw new Error(data.error);
    }
    
    const move = data.move;
    
    if (move === undefined || move === null) {
      console.error('❌ 后端返回的移动位置无效:', data);
      throw new Error('后端返回的移动位置无效');
    }
    
    console.log('✅ 成功获取移动位置:', move);
    return move;
    
  } catch (error) {
    console.error('❌ LLM API调用失败:', error);
    return -1;
  }
}

/**
 * 检查LLM服务是否可用
 * @returns {boolean}
 */
export function isLLMServiceAvailable() {
  // 检查后端服务器是否可用
  const hasServerEndpoint = !!process.env.REACT_APP_SERVER || true; // 默认假设本地服务器可用
  
  console.log('🔧 LLM服务可用性检查:', {
    hasServerEndpoint,
    serverEndpoint: process.env.REACT_APP_SERVER || 'http://localhost:8000',
    llmApiEndpoint: LLM_API_ENDPOINT
  });
  
  return hasServerEndpoint;
} 