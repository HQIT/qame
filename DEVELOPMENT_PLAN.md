# 多人游戏平台开发计划

## 项目概述

构建一个支持多种游戏的多人游戏平台，支持AI玩家和人类玩家对战。

## 重要说明

**本项目不提供用户注册功能，所有用户账户由管理员通过管理控制台创建。**
- 用户无法自行注册账户
- 管理员可以通过管理控制台创建新用户
- 系统启动时会自动创建默认管理员账户（用户名：admin，密码：admin123）

## 技术架构

### 后端技术栈
- **Game Server**: boardgame.io (Node.js) - 专门处理游戏逻辑
- **API Server**: Express.js (Node.js) - 专门处理业务逻辑（认证、AI等）
- **数据库**: PostgreSQL - 用户数据、游戏数据、AI配置
- **缓存**: Redis - 会话管理、房间状态
- **认证**: JWT (JSON Web Tokens)
- **密码加密**: bcryptjs

### 前端技术栈
- **框架**: React.js
- **游戏客户端**: boardgame.io/react
- **HTTP客户端**: fetch API
- **状态管理**: React Hooks

### 部署架构
- **容器化**: Docker + Docker Compose
- **HTTPS支持**: Nginx反向代理 + SSL证书
- **服务分离**:
  - `nginx` (端口80/443) - HTTPS反向代理
  - `frontend` (内部端口3000) - React前端
  - `game-server` (内部端口8000) - boardgame.io游戏服务器
  - `api-server` (内部端口8001) - Express API服务器
  - `postgres` (端口5432) - PostgreSQL数据库
  - `redis` (端口6379) - Redis缓存

## API响应格式规范

### 统一响应格式
所有API响应都使用以下格式：
```javascript
{
  "code": 200,           // 数字状态码
  "message": "操作成功",  // 中文消息
  "data": {...}          // 响应数据，失败时为null
}
```

### 状态码定义
- `200` - 操作成功
- `400` - 请求参数错误
- `401` - 认证失败
- `404` - 资源不存在
- `409` - 资源冲突
- `500` - 服务器内部错误

### 错误响应示例
```javascript
{
  "code": 401,
  "message": "用户名或密码错误",
  "data": null
}
```

### 成功响应示例
```javascript
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "username": "testuser"
    }
  }
}
```

## 数据库设计

### 核心表结构

#### 用户表 (users)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 游戏表 (games)
```sql
CREATE TABLE games (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 2,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### AI提供商表 (ai_providers)
```sql
CREATE TABLE ai_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### AI类型表 (ai_types)
```sql
CREATE TABLE ai_types (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER REFERENCES ai_providers(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  endpoint VARCHAR(255) NOT NULL,
  config_schema JSONB DEFAULT '{}',
  supported_games TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 房间表 (rooms)
```sql
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50) REFERENCES games(id),
  name VARCHAR(100) NOT NULL,
  max_players INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 房间座位表 (room_seats)
```sql
CREATE TABLE room_seats (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  ai_type_id INTEGER REFERENCES ai_types(id),
  status VARCHAR(20) DEFAULT 'empty',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, seat_number)
);
```

#### 游戏会话表 (game_sessions)
```sql
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  game_id VARCHAR(50) REFERENCES games(id),
  game_state JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API设计

### 认证API (`/api/auth`)
- `POST /login` - 用户登录
- `POST /logout` - 用户登出
- `GET /profile` - 获取用户信息
- `PUT /profile` - 更新用户信息
- `GET /verify` - 验证token

**注意：本项目不提供用户注册功能，所有用户账户由管理员通过管理控制台创建。**

### Admin API (`/api/admin`)
- `GET /users` - 获取用户列表
- `PUT /users/:id` - 更新用户信息
- `DELETE /users/:id` - 删除用户
- `GET /stats` - 获取系统统计

### AI API (`/api/ai`)
- `GET /types` - 获取AI类型列表
- `POST /move` - 调用AI获取移动
- `POST /test` - 测试AI提供商连接

### 游戏API (boardgame.io)
- 游戏逻辑由boardgame.io框架处理
- 前端通过WebSocket连接游戏服务器

## 开发阶段

### 第一阶段：基础架构 ✅
- [x] 数据库迁移脚本
- [x] 用户认证API (API Server)
- [x] JWT认证中间件
- [x] 前端登录页面
- [x] 基础路由设置
- [x] Docker配置更新
- [x] 服务分离架构
- [x] API响应格式标准化
- [x] Admin用户角色系统
- [x] Admin权限控制
- [x] Admin UI界面
- [x] 用户管理功能
- [x] 系统统计功能

### 第二阶段：AI系统
- [ ] AI提供商管理
- [ ] AI类型配置
- [ ] AI调用服务
- [ ] AI性能监控
- [ ] AI fallback机制

### 第三阶段：房间系统
- [ ] 房间创建和管理
- [ ] 座位分配系统
- [ ] 房间状态管理
- [ ] 玩家加入/离开
- [ ] 房间权限控制

### 第四阶段：游戏集成
- [ ] 游戏状态同步
- [ ] AI玩家集成
- [ ] 游戏结果记录
- [ ] 游戏历史查询
- [ ] 实时通知系统

### 第五阶段：测试和部署
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 生产环境部署
- [ ] 监控和日志

## 文件结构

```
boardgame/
├── frontend/                 # React前端
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── games/          # 游戏组件
│   │   └── services/       # API服务
│   └── Dockerfile
├── server/                  # boardgame.io游戏服务器
│   ├── games/              # 游戏逻辑
│   └── Dockerfile
├── api-server/             # Express API服务器
│   ├── config/             # 数据库配置
│   ├── routes/             # API路由
│   ├── models/             # 数据模型
│   ├── services/           # 业务服务
│   ├── middleware/         # 中间件
│   ├── migrations/         # 数据库迁移
│   └── Dockerfile
├── docker-compose.yml      # 服务编排
└── DEVELOPMENT_PLAN.md     # 开发计划
```

## 部署说明

### 本地开发
```bash
# 启动所有服务
docker-compose up --build -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 服务端口
- 前端: https://localhost (通过Nginx)
- 游戏服务器: https://localhost/games (通过Nginx)
- API服务器: https://localhost/api (通过Nginx)
- 数据库: localhost:5432
- Redis: localhost:6379

## 开发规范

### 代码规范
- 使用ESLint进行代码检查
- 遵循JavaScript标准规范
- 使用中文注释和日志

### Git规范
- 功能分支: `feature/功能名称`
- 修复分支: `fix/问题描述`
- 提交信息: `类型: 简短描述`

### 测试规范
- 单元测试覆盖率 > 80%
- 集成测试覆盖主要流程
- 性能测试确保响应时间 < 2s 