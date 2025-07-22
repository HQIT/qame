const { Server, Origins } = require('boardgame.io/server');
const TicTacToe = require('./games/TicTacToe');
const { request } = require('undici');

// 添加全局错误处理
process.on('uncaughtException', (err) => {
  console.log('全局错误:', err.message);
  console.log('错误堆栈:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('未处理的 Promise 拒绝:', reason);
});

// LLM配置
const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || 'sk-93731c45692e40529633d2f1619c5da7',
  apiEndpoint: process.env.LLM_API_ENDPOINT || 'https://chat.ecnu.edu.cn/open/api/v1/chat/completions',
  model: process.env.LLM_MODEL || 'ecnu-max',
  maxTokens: 100,
  temperature: 0.1
};

// 创建boardgame.io服务器
const server = Server({
  games: [TicTacToe],
  origins: [
    // 允许本地开发环境连接
    Origins.LOCALHOST_IN_DEVELOPMENT,
    // 允许前端应用连接
    'http://localhost:3000',
    'http://localhost:80',
    'http://192.168.1.156:3000',
    'http://192.168.1.156:80'
  ],
});

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

// 启动服务器
server.run(8000, () => {
  console.log('🎮 Boardgame.io 服务器运行在端口 8000');
  console.log('🗄️  使用内存数据库（开发模式）');
  
  // 添加简单的HTTP处理程序来处理LLM请求
  const http = require('http');
  const url = require('url');
  
  const llmServer = http.createServer(async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    if (req.method === 'POST' && parsedUrl.pathname === '/api/llm/move') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const { prompt } = JSON.parse(body);
          
          console.log('🤖 后端收到LLM请求:', { prompt });
          
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
          
          // 使用undici进行HTTP请求
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
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'LLM API调用失败' }));
            return;
          }

          const data = JSON.parse(await responseBody.text());
          console.log('📥 LLM API响应:', data);
          
          const moveText = data.choices[0]?.message?.content?.trim();
          
          if (!moveText) {
            console.error('❌ LLM返回内容为空');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'LLM返回内容为空' }));
            return;
          }

          // 解析LLM返回的内容
          const move = parseLLMResponse(moveText);
          
          if (move === -1) {
            console.error('❌ 无法解析LLM返回的移动位置:', moveText);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '无法解析LLM返回的移动位置' }));
            return;
          }
          
          console.log('✅ 成功解析移动位置:', move);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ move }));
          
        } catch (error) {
          console.error('❌ LLM API调用异常:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'LLM API调用异常' }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  // 在另一个端口启动LLM API服务器
  llmServer.listen(8001, () => {
    console.log('🤖 LLM API服务器运行在端口 8001');
    console.log('🤖 LLM API端点: http://localhost:8001/api/llm/move');
  });
}); 