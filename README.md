# 🎮 多人在线游戏平台

基于 [boardgame.io](https://boardgame.io/) 构建的简洁多人在线游戏平台。

## 🚀 功能特性

- **多人在线游戏**: 支持井字棋等经典游戏
- **实时对战**: 基于 boardgame.io 的实时通信
- **游戏大厅**: 使用 boardgame.io 内置的 Lobby 系统
- **Docker 部署**: 一键部署所有服务

## 🏗️ 技术栈

- **前端**: React + boardgame.io/react
- **后端**: boardgame.io/server
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

2. 启动所有服务
```bash
docker-compose up --build
```

3. 访问应用
- 前端: http://localhost:3000
- 游戏服务器: http://localhost:8000

## 🎯 游戏列表

### 井字棋 (Tic-Tac-Toe)
- 经典3x3网格游戏
- 两名玩家轮流放置X和O
- 支持实时对战

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
└── README.md
```

## 🛠️ 开发指南

### 添加新游戏

1. 在 `server/games/` 创建游戏逻辑
2. 在 `frontend/src/games/` 创建游戏界面
3. 在 `server/server.js` 中注册游戏
4. 在 `frontend/src/App.js` 中添加游戏组件

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
```

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口 3000 和 8000 是否被占用
   - 修改 docker-compose.yml 中的端口映射

2. **游戏连接失败**
   - 确保游戏服务器正常运行
   - 检查浏览器控制台错误信息

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs frontend
docker-compose logs game-server
```

## 📚 参考资源

- [boardgame.io 官方文档](https://boardgame.io/documentation/)
- [boardgame.io 教程](https://boardgame.io/documentation/#/tutorial)
- [boardgame.io API 参考](https://boardgame.io/documentation/#/api)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！ 