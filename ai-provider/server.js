const express = require('express');
const cors = require('cors');
const { request } = require('undici');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// LLM配置
const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || 'sk-93731c45692e40529633d2f1619c5da7',
  apiEndpoint: process.env.LLM_API_ENDPOINT || 'https://chat.ecnu.edu.cn/open/api/v1/chat/completions',
  model: process.env.LLM_MODEL || 'ecnu-max',
  maxTokens: 100,
  temperature: 0.1
};

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

// AI移动接口
app.post('/api/llm-bot-v1/move', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    console.log('🤖 AI提供商收到请求:', { prompt });
    
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
    
    // 调用LLM API
    const { statusCode, body: responseBody } = await request(LLM_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (statusCode !== 200) {
      const errorText = await responseBody.text();
      console.error('❌ LLM API调用失败:', errorText);
      return res.status(500).json({ error: 'LLM API调用失败' });
    }

    const data = JSON.parse(await responseBody.text());
    console.log('📥 LLM API响应:', data);
    
    const moveText = data.choices[0]?.message?.content?.trim();
    
    if (!moveText) {
      console.error('❌ LLM返回内容为空');
      return res.status(500).json({ error: 'LLM返回内容为空' });
    }

    // 解析LLM返回的内容
    const move = parseLLMResponse(moveText);
    
    if (move === -1) {
      console.error('❌ 无法解析LLM返回的移动位置:', moveText);
      return res.status(500).json({ error: '无法解析LLM返回的移动位置' });
    }
    
    console.log('✅ 成功解析移动位置:', move);
    res.json({ move });
    
  } catch (error) {
    console.error('❌ AI提供商调用异常:', error);
    res.status(500).json({ error: 'AI提供商调用异常' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-provider-demo',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 AI提供商服务运行在端口 ${PORT}`);
  console.log(`🤖 AI移动接口: http://localhost:${PORT}/api/llm-bot-v1/move`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
}); 