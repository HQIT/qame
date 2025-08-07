# LLM Player重构计划

## 当前架构分析

### 现有AI实现方式
1. **boardgame.io内置Bot机制** (`server/games/TicTacToe.js`)
   - 在`onTurn`钩子中检测AI玩家
   - 调用`aiService.getAIMove()`获取移动
   - 直接修改游戏状态并结束回合

2. **前端AI组件** (`frontend/src/components/AIBot.js`, `LLMBot.js`)
   - 在React组件中检测AI玩家
   - 调用LLM API获取移动
   - 通过`moves.clickCell()`执行移动

### 问题分析
- AI逻辑分散在前后端
- 难以统一管理AI行为
- 前端AI需要渲染UI（虽然不显示）
- 扩展性差

## 重构目标

将LLM Player重构为**独立的client**，与人类玩家完全对等，但不需要渲染UI。

## 新架构设计

### 1. 核心概念

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   人类玩家      │    │   LLM Player    │    │   游戏服务器    │
│   (Frontend)    │    │   (AI Client)   │    │ (boardgame.io)  │
│                 │    │                 │    │                 │
│ - 渲染UI        │    │ - 无UI渲染      │    │ - 游戏逻辑      │
│ - 用户交互      │    │ - LLM决策       │    │ - 状态管理      │
│ - Socket.IO     │    │ - Socket.IO     │    │ - 实时通信      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. 组件结构

#### 2.1 AI Client (`ai-client/`)
```
ai-client/
├── src/
│   ├── index.js              # 主入口
│   ├── AIClient.js           # AI客户端核心
│   ├── LLMService.js         # LLM服务接口
│   ├── GameStateAnalyzer.js  # 游戏状态分析
│   └── config/
│       └── ai-config.js      # AI配置
├── package.json
└── Dockerfile
```

#### 2.2 服务层重构
```
server/
├── services/
│   ├── aiService.js          # 重构：移除AI逻辑，只保留配置管理
│   └── clientManager.js      # 新增：管理AI客户端连接
├── games/
│   └── TicTacToe.js          # 重构：移除onTurn AI逻辑
```

### 3. 实现步骤

#### 阶段1：创建AI Client基础框架
1. 创建`ai-client`目录和基础结构
2. 实现`AIClient`类，继承boardgame.io的Socket.IO客户端
3. 实现基本的游戏状态监听和移动执行

#### 阶段2：集成LLM服务
1. 实现`LLMService`类，封装LLM API调用
2. 实现`GameStateAnalyzer`，分析游戏状态并生成提示词
3. 实现AI决策逻辑

#### 阶段3：重构服务端
1. 移除`TicTacToe.js`中的AI逻辑
2. 重构`aiService.js`，只保留配置管理
3. 实现`clientManager.js`，管理AI客户端生命周期

#### 阶段4：集成和测试
1. 在Docker Compose中添加AI Client服务
2. 测试AI Client与游戏服务器的集成
3. 优化性能和错误处理

## 详细实现

### 1. AI Client核心类

```javascript
// ai-client/src/AIClient.js
import { SocketIO } from 'boardgame.io/multiplayer';
import { LLMService } from './LLMService';
import { GameStateAnalyzer } from './GameStateAnalyzer';

class AIClient {
  constructor(config) {
    this.config = config;
    this.socket = null;
    this.llmService = new LLMService(config.llm);
    this.analyzer = new GameStateAnalyzer();
    this.isConnected = false;
  }

  async connect(matchID, playerID, credentials) {
    // 连接到boardgame.io服务器
    this.socket = SocketIO({
      server: this.config.gameServer
    });

    // 监听游戏状态变化
    this.socket.on('update', this.handleGameUpdate.bind(this));
    
    // 连接到match
    await this.socket.connect(matchID, playerID, credentials);
  }

  async handleGameUpdate(gameState) {
    // 检查是否轮到AI
    if (this.isMyTurn(gameState)) {
      const move = await this.makeDecision(gameState);
      if (move !== null) {
        await this.executeMove(move);
      }
    }
  }

  async makeDecision(gameState) {
    // 分析游戏状态
    const analysis = this.analyzer.analyze(gameState);
    
    // 调用LLM服务
    const move = await this.llmService.getMove(analysis);
    
    return move;
  }

  async executeMove(move) {
    // 通过Socket.IO执行移动
    await this.socket.move('clickCell', [move]);
  }
}
```

### 2. LLM服务接口

```javascript
// ai-client/src/LLMService.js
class LLMService {
  constructor(config) {
    this.config = config;
  }

  async getMove(gameAnalysis) {
    const prompt = this.generatePrompt(gameAnalysis);
    
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        prompt,
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    const data = await response.json();
    return this.parseMove(data);
  }

  generatePrompt(gameAnalysis) {
    // 生成游戏提示词
    return `当前游戏状态：${JSON.stringify(gameAnalysis)}
请选择最佳移动位置（0-8）：`;
  }

  parseMove(response) {
    // 解析LLM响应，提取移动位置
    const content = response.choices[0]?.message?.content;
    const moveMatch = content.match(/\d+/);
    return moveMatch ? parseInt(moveMatch[0]) : null;
  }
}
```

### 3. 游戏状态分析器

```javascript
// ai-client/src/GameStateAnalyzer.js
class GameStateAnalyzer {
  analyze(gameState) {
    const { G, ctx } = gameState;
    
    return {
      board: G.cells,
      currentPlayer: ctx.currentPlayer,
      turn: ctx.turn,
      gameover: ctx.gameover,
      availableMoves: this.getAvailableMoves(G.cells),
      winningMoves: this.getWinningMoves(G.cells, ctx.currentPlayer),
      blockingMoves: this.getBlockingMoves(G.cells, ctx.currentPlayer)
    };
  }

  getAvailableMoves(cells) {
    return cells.map((cell, index) => cell === null ? index : -1).filter(i => i !== -1);
  }

  getWinningMoves(cells, player) {
    // 检查获胜移动
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (cells[i] === null) {
        const tempCells = [...cells];
        tempCells[i] = player;
        if (this.checkWin(tempCells, player)) {
          moves.push(i);
        }
      }
    }
    return moves;
  }

  getBlockingMoves(cells, player) {
    // 检查阻止对手获胜的移动
    const opponent = player === '0' ? '1' : '0';
    return this.getWinningMoves(cells, opponent);
  }

  checkWin(cells, player) {
    // 检查获胜条件
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
      [0, 4, 8], [2, 4, 6] // 对角线
    ];

    return lines.some(line => 
      line.every(index => cells[index] === player)
    );
  }
}
```

### 4. Docker集成

```yaml
# docker-compose.yml 新增服务
services:
  ai-client:
    build: ./ai-client
    environment:
      - GAME_SERVER_URL=http://game-server:8000
      - LLM_API_ENDPOINT=${LLM_API_ENDPOINT}
      - LLM_API_KEY=${LLM_API_KEY}
      - LLM_MODEL=${LLM_MODEL}
    depends_on:
      - game-server
      - api-server
    restart: unless-stopped
```

## 优势

1. **架构清晰**：AI逻辑完全独立，易于维护和扩展
2. **性能优化**：AI不需要渲染UI，资源消耗更少
3. **扩展性强**：可以轻松添加新的AI类型和策略
4. **测试友好**：AI Client可以独立测试
5. **部署灵活**：AI Client可以独立部署和扩展

## 迁移策略

1. **渐进式迁移**：先实现AI Client，再逐步移除现有AI逻辑
2. **向后兼容**：保持现有API接口不变
3. **A/B测试**：可以同时运行新旧AI系统进行对比
4. **回滚机制**：保留原有AI逻辑作为备选方案

## 后续扩展

1. **多AI支持**：支持不同类型的AI（传统算法、LLM、强化学习等）
2. **AI训练**：收集游戏数据用于AI训练
3. **AI评估**：实现AI性能评估和排名系统
4. **AI配置**：支持动态配置AI参数和行为
