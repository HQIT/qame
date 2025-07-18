/**
 * LLM服务模块
 * 用于调用大语言模型API获取游戏决策
 */

// TODO: 用户需要配置API密钥和端点
const LLM_CONFIG = {
  apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'sk-93731c45692e40529633d2f1619c5da7',
  apiEndpoint: process.env.REACT_APP_LLM_API_ENDPOINT || 'https://chat.ecnu.edu.cn/open/api/v1/chat/completions',
  model: process.env.REACT_APP_LLM_MODEL || 'ecnu-max',
  maxTokens: 100,
  temperature: 0.1
};

/**
 * 调用LLM API获取游戏决策
 * @param {string} prompt - 发送给LLM的提示词
 * @returns {Promise<number>} 返回选中的位置索引(0-8)，失败时返回-1
 */
export async function getLLMMove(prompt) {
  try {
    console.log('🤖 调用LLM API获取决策...');
    console.log('📤 发送的提示词:');
    console.log('='.repeat(50));
    console.log(prompt);
    console.log('='.repeat(50));
    
    // 添加配置检查
    console.log('🔧 LLM配置检查:', {
      hasApiKey: !!LLM_CONFIG.apiKey,
      apiKeyLength: LLM_CONFIG.apiKey?.length,
      apiKeyPrefix: LLM_CONFIG.apiKey?.substring(0, 10) + '...',
      endpoint: LLM_CONFIG.apiEndpoint,
      model: LLM_CONFIG.model
    });
    
    const requestBody = {
      model: LLM_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: '你是一个井字棋AI助手。请根据当前游戏状态选择最佳移动位置。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: LLM_CONFIG.maxTokens,
      temperature: LLM_CONFIG.temperature
    };
    
    console.log('🔧 API配置:', {
      endpoint: LLM_CONFIG.apiEndpoint,
      model: LLM_CONFIG.model,
      maxTokens: LLM_CONFIG.maxTokens,
      temperature: LLM_CONFIG.temperature
    });
    
    const response = await fetch(LLM_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 HTTP响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API调用失败，响应内容:', errorText);
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 完整API响应:', JSON.stringify(data, null, 2));
    
    const moveText = data.choices[0]?.message?.content?.trim();
    
    if (!moveText) {
      console.error('❌ LLM返回内容为空，完整响应:', data);
      throw new Error('LLM返回内容为空');
    }

    console.log('🤖 LLM返回的原始内容:', moveText);
    
    // 解析LLM返回的内容
    const move = parseLLMResponse(moveText);
    
    if (move === -1) {
      console.error('❌ 无法解析LLM返回的移动位置，原始内容:', moveText);
      throw new Error('无法解析LLM返回的移动位置');
    }
    
    console.log('✅ 成功解析移动位置:', move);
    return move;
    
  } catch (error) {
    console.error('❌ LLM API调用失败:', error);
    return -1;
  }
}

/**
 * 解析LLM返回的响应
 * @param {string} response - LLM返回的文本
 * @returns {number} 位置索引(0-8)，解析失败返回-1
 */
function parseLLMResponse(response) {
  // 尝试多种解析方式
  
  // 1. 直接数字 (0-8)
  const directNumber = parseInt(response);
  if (!isNaN(directNumber) && directNumber >= 0 && directNumber <= 8) {
    return directNumber;
  }
  
  // 2. 提取数字
  const numberMatch = response.match(/\b([0-8])\b/);
  if (numberMatch) {
    return parseInt(numberMatch[1]);
  }
  
  // 3. 位置描述解析
  const positionMap = {
    'center': 4,
    'centre': 4,
    'middle': 4,
    'top-left': 0, 'top left': 0, '左上': 0,
    'top-right': 2, 'top right': 2, '右上': 2,
    'bottom-left': 6, 'bottom left': 6, '左下': 6,
    'bottom-right': 8, 'bottom right': 8, '右下': 8,
    'top': 1, '上': 1,
    'bottom': 7, '下': 7,
    'left': 3, '左': 3,
    'right': 5, '右': 5
  };
  
  const lowerResponse = response.toLowerCase();
  for (const [key, value] of Object.entries(positionMap)) {
    if (lowerResponse.includes(key)) {
      return value;
    }
  }
  
  // 4. 坐标解析 (row, col)
  const coordMatch = response.match(/\(?(\d),\s*(\d)\)?/);
  if (coordMatch) {
    const row = parseInt(coordMatch[1]);
    const col = parseInt(coordMatch[2]);
    if (row >= 0 && row <= 2 && col >= 0 && col <= 2) {
      return row * 3 + col;
    }
  }
  
  console.warn('⚠️ 无法解析LLM响应:', response);
  return -1;
}

/**
 * 检查LLM服务是否可用
 * @returns {boolean}
 */
export function isLLMServiceAvailable() {
  // 添加环境变量调试
  console.log('🔧 环境变量检查:', {
    REACT_APP_OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY ? '已设置' : '未设置',
    REACT_APP_LLM_API_ENDPOINT: process.env.REACT_APP_LLM_API_ENDPOINT ? '已设置' : '未设置',
    REACT_APP_LLM_MODEL: process.env.REACT_APP_LLM_MODEL ? '已设置' : '未设置',
    NODE_ENV: process.env.NODE_ENV
  });
  
  const isAvailable = LLM_CONFIG.apiKey && 
                     LLM_CONFIG.apiKey !== 'your-api-key-here' && 
                     LLM_CONFIG.apiEndpoint;
  
  console.log('🔧 LLM服务可用性检查:', {
    hasApiKey: !!LLM_CONFIG.apiKey,
    apiKeyIsDefault: LLM_CONFIG.apiKey === 'your-api-key-here',
    apiKeyValue: LLM_CONFIG.apiKey ? LLM_CONFIG.apiKey.substring(0, 10) + '...' : 'null',
    hasEndpoint: !!LLM_CONFIG.apiEndpoint,
    endpointValue: LLM_CONFIG.apiEndpoint,
    isAvailable,
    config: {
      endpoint: LLM_CONFIG.apiEndpoint,
      model: LLM_CONFIG.model,
      maxTokens: LLM_CONFIG.maxTokens,
      temperature: LLM_CONFIG.temperature
    }
  });
  
  return isAvailable;
} 