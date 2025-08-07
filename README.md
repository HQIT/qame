# 🎮 多人在线游戏平台

基于 [boardgame.io](https://boardgame.io/) 构建的简洁多人在线游戏平台。

## 🚀 功能特性

- **多人在线游戏**: 支持井字棋等经典游戏
- **实时对战**: 基于 boardgame.io 的实时通信
- **游戏大厅**: 使用 boardgame.io 内置的 Lobby 系统
- **用户管理**: 管理员控制台，统一管理用户账户
- **AI玩家**: 独立的AI客户端，支持LLM集成
- **Docker 部署**: 一键部署所有服务

## ⚠️ 重要说明

**本项目不提供用户注册功能，所有用户账户由管理员通过管理控制台创建。**
- 系统启动时会自动创建默认管理员账户（用户名：admin，密码：admin123）
- 管理员可以通过管理控制台创建新用户
- 用户无法自行注册账户

## 🏗️ 技术栈

- **前端**: React + boardgame.io/react
- **后端**: boardgame.io/server
- **AI客户端**: Node.js + Socket.IO + LLM集成
- **部署**: Docker Compose

## 📦 快速开始

### 环境要求
- Docker
- Docker Compose

### 启动服务

1. 克隆项目
```bash
git clone <repository-url>
cd boardgame
```

2. 配置环境变量（可选）
```bash
# 创建.env文件（用于AI Client）
cp .env.example .env
# 编辑.env文件，配置LLM API密钥等
```

3. 启动所有服务
```bash
docker-compose up --build
```

4. 访问应用
- 前端: http://localhost:3000
- 游戏服务器: http://localhost:8000
- API服务器: http://localhost:8001

## 🎯 游戏列表

### 井字棋 (Tic-Tac-Toe)
- 经典3x3网格游戏
- 两名玩家轮流放置X和O
- 支持实时对战
- 支持AI玩家（LLM或传统算法）

## 🤖 AI玩家

### 架构设计

项目采用**独立AI客户端**架构，AI玩家与人类玩家完全对等：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   人类玩家      │    │   AI Client     │    │   游戏服务器    │
│   (Frontend)    │    │   (AI Client)   │    │ (boardgame.io)  │
│                 │    │                 │    │                 │
│ - 渲染UI        │    │ - 无UI渲染      │    │ - 游戏逻辑      │
│ - 用户交互      │    │ - LLM决策       │    │ - 状态管理      │
│ - Socket.IO     │    │ - Socket.IO     │    │ - 实时通信      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### AI客户端特性

- **独立运行**: 与前端完全分离，不需要UI渲染
- **LLM集成**: 支持OpenAI、Claude等主流LLM API
- **实时通信**: 通过Socket.IO与游戏服务器实时交互
- **错误处理**: 完善的错误处理和fallback机制
- **状态监控**: 实时状态监控和日志记录

### 使用AI玩家

1. **配置LLM API**
   ```bash
   # 在.env文件中配置
   LLM_API_ENDPOINT=https://api.openai.com/v1/chat/completions
   LLM_API_KEY=your-openai-api-key
   LLM_MODEL=gpt-3.5-turbo
   ```

2. **启动AI客户端**
   ```bash
   # 使用Docker Compose（推荐）
   docker-compose up ai-client
   
   # 或直接运行
   cd ai-client
   npm install
   node src/index.js <matchID> <playerID> <credentials>
   ```

3. **AI行为配置**
   - 思考时间：1-3秒随机
   - 决策策略：LLM + 传统算法fallback
   - 移动验证：自动验证移动有效性

## 📁 项目结构

```
boardgame/
├── docker-compose.yml          # Docker Compose 配置
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── games/             # 游戏逻辑和界面
│   │   └── App.js             # 主应用组件
│   └── package.json
├── server/                     # boardgame.io 服务器
│   ├── games/                 # 游戏逻辑
│   ├── server.js              # 服务器文件
│   └── package.json
├── ai-client/                  # AI客户端（新增）
│   ├── src/
│   │   ├── AIClient.js        # AI客户端核心
│   │   ├── LLMService.js      # LLM服务接口
│   │   ├── GameStateAnalyzer.js # 游戏状态分析
│   │   └── index.js           # 主入口
│   ├── config/
│   │   └── ai-config.js       # AI配置
│   ├── test/                  # 测试文件
│   ├── Dockerfile             # AI客户端Dockerfile
│   └── README.md              # AI客户端文档
├── api-server/                 # API服务器
│   ├── routes/                # API路由
│   ├── models/                # 数据模型
│   └── package.json
└── README.md
```

## 🛠️ 开发指南

### 添加新游戏

1. 在 `server/games/` 创建游戏逻辑
2. 在 `frontend/src/games/` 创建游戏界面
3. 在 `server/server.js` 中注册游戏
4. 在 `frontend/src/App.js` 中添加游戏组件
5. 在 `ai-client/src/GameStateAnalyzer.js` 中添加游戏分析逻辑

### 扩展AI功能

1. **添加新的AI策略**
   ```bash
   # 在ai-client/src/下创建新的AI策略类
   # 实现getMove(gameAnalysis)方法
   # 在AIClient.js中集成新策略
   ```

2. **支持新的LLM服务**
   ```bash
   # 继承LLMService类
   # 实现自定义的API调用逻辑
   # 配置新的LLM服务
   ```

### 本地开发

```bash
# 启动前端开发服务器
cd frontend
npm install
npm start

# 启动后端开发服务器
cd server
npm install
npm run dev

# 启动AI客户端
cd ai-client
npm install
npm run dev
```

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口是否被占用
   - 修改docker-compose.yml中的端口映射

2. **AI客户端连接失败**
   - 检查`GAME_SERVER_URL`配置
   - 确认游戏服务器正在运行
   - 查看AI客户端日志

3. **LLM API错误**
   - 验证API密钥和端点
   - 检查API配额和限制
   - 查看API响应日志

### 调试模式

```bash
# 启用AI客户端调试模式
AI_DEBUG=true docker-compose up ai-client

# 查看详细日志
docker-compose logs -f ai-client
```

## �� 许可证

MIT License 