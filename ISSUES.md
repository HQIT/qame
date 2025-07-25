# 项目问题记录

## 当前问题

### 2024-12-20 - 游戏大厅和Match系统问题
**状态：** 待解决
**优先级：** 高

**问题描述：**
1. **玩家列表显示问题** - 显示"玩家列表: admin, 未命名"，应该正确显示玩家名称，未命名应该是缺一个玩家的意思
2. **游戏开始逻辑错误** - 进入游戏后直接开始，应该等待所有玩家确认后才开始
3. **AI玩家确认机制缺失** - AI玩家进入后应该自动确认开始，但人类玩家需要手动确认
4. **单人游戏问题** - 只有一个人（admin）也能开始游戏，当前井字棋游戏来说是不对的；且输赢判定错误
5. **游戏内返回大厅跳转错误** - 跳转路径不正确
6. **缺少退出Match功能** - 没有退出Match的选项
7. **已满员Match清理问题** - 显示"玩家列表: 未命名, 未命名"的满员Match无法清理

**影响范围：**
- 游戏大厅用户体验
- 多人游戏逻辑
- AI玩家集成
- 游戏状态管理

**相关文件：**
- `frontend/src/components/EnhancedLobby.js` - 游戏大厅组件
- `frontend/src/components/GameView.js` - 游戏界面组件
- `frontend/src/games/TicTacToe.js` - 井字棋游戏逻辑
- `frontend/src/games/TicTacToeBoard.js` - 井字棋游戏界面

**解决方案思路：**
1. 修复玩家名称显示逻辑
2. 实现游戏开始确认机制
3. 添加AI玩家自动确认功能
4. 修复单人游戏逻辑和输赢判定
5. 修复游戏内导航
6. 添加退出Match功能
7. 实现Match清理机制

---

## 已解决的问题

### 2024-12-19 - 系统统计显示问题
**状态：** 已解决
**解决方案：** 
1. 修改了 `api-server/models/User.js` 中的 `getStats()` 方法
2. 返回嵌套结构以匹配前端期望的数据格式
3. 添加了房间和在线用户的默认统计信息

**相关文件：**
- `api-server/models/User.js` - 用户模型和统计方法

### 2024-12-19 - 登录持久化问题
**状态：** 已解决
**解决方案：** 
1. 统一API调用方式，创建 `frontend/src/utils/api.js` 统一API工具
2. 所有API调用都使用 `credentials: 'include'` 发送Cookie
3. 移除了所有使用 `localStorage.getItem('token')` 和 `Authorization: Bearer` 的代码
4. 修改了 `api-server/middleware/auth.js` 支持Cookie认证
5. 修改了 `api-server/routes/auth.js` 中的 `/verify` 路由，移除循环依赖

**相关文件：**
- `frontend/src/utils/api.js` - 统一API工具
- `frontend/src/App.js` - 前端认证逻辑
- `api-server/middleware/auth.js` - 认证中间件
- `api-server/routes/auth.js` - 认证API

### 2024-12-19 - 管理员控制台用户管理问题
**状态：** 已解决
**解决方案：** 修改前端认证方式，使用Cookie而不是sessionStorage进行API调用

### 2024-12-19 - 用户注册功能移除
**状态：** 已解决
**解决方案：** 移除了用户注册API和相关前端功能，添加了明确的文档说明

### 2024-12-19 - 密码哈希统一盐值
**状态：** 已解决
**解决方案：** 使用统一的盐值进行密码哈希，移除了用户特定的盐值字段 