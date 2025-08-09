# LLM AI Service

基于大语言模型(LLM)的游戏AI客户端服务，可作为外部AI开发者的参考实现。

## 🎯 概述

这是一个标准的AI客户端实现，展示如何：
- 实现统一的 `/move` 接口
- 与 ai-manager 进行通信
- 集成大语言模型进行游戏决策

外部开发者可以参考此实现，使用任何技术栈创建自己的AI客户端。

## 🚀 快速启动

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp env.template .env
# 编辑 .env 文件，填入你的LLM API配置
```

### 3. 启动服务
```bash
npm start
# 或开发模式
npm run dev
```

服务将在 `http://localhost:3003` 启动

## 📋 API接口

### 健康检查
```
GET /health
```

### AI移动接口
```
POST /move
Content-Type: application/json

{
  "game_type": "tic-tac-toe",
  "match_id": "match-123",
  "player_id": "0", 
  "game_state": {
    "cells": [null, "X", null, "O", null, null, null, null, null]
  },
  "valid_moves": [0, 2, 4, 5, 6, 7, 8]
}
```

**响应:**
```json
{
  "move": 4,
  "confidence": 0.8,
  "thinking_time": 1250,
  "metadata": {
    "algorithm": "llm-based",
    "model": "gpt-3.5-turbo"
  }
}
```

## 🎮 支持的游戏

- **tic-tac-toe**: 井字棋

可以通过扩展 `src/handlers/` 目录添加更多游戏支持。

## 🏗️ 架构说明

```
src/
├── index.js              # 主服务器文件
├── services/
│   └── LLMAIService.js    # LLM调用服务
└── handlers/
    ├── gameHandlers.js    # 游戏处理器映射
    └── ticTacToeHandler.js # 井字棋处理器
```

## 🔧 自定义开发

### 添加新游戏支持

1. 在 `src/handlers/` 下创建新的游戏处理器
2. 实现 `getMove(llmAI, gameState, validMoves, metadata)` 方法
3. 在 `gameHandlers.js` 中注册新处理器

### 替换AI算法

你可以完全替换LLM部分，使用任何AI算法：
- 规则引擎
- 深度学习模型
- 搜索算法(minimax等)
- 强化学习模型

只需保持 `/move` 接口不变即可。

## 🐳 Docker部署

```bash
docker build -t my-ai-client .
docker run -p 3003:3003 --env-file .env my-ai-client
```

## 📝 在平台中注册

1. 启动你的AI服务
2. 在游戏平台的AI管理后台选择"外部AI"
3. 填入你的服务端点: `http://your-server:3003`
4. 选择支持的游戏
5. 保存配置

## 🤝 开发者社区

欢迎提交你的AI实现到社区：
- 分享有趣的AI策略
- 贡献新游戏支持
- 优化性能和准确性

## 📖 更多资源

- [游戏平台API文档](../docs/)
- [AI开发最佳实践](../docs/ai-development.md)
- [示例AI实现](../examples/)
