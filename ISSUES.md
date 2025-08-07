# 项目问题记录

## 当前问题

### 2024-08-04 - 游戏流程和Match管理进阶问题
**状态：** 修复中，等待用户测试确认
**优先级：** 高

**问题描述：**
1. **过早进入游戏问题** - 玩家未到齐就能进入游戏对战界面（井字棋），缺乏等待房间机制
2. **返回大厅空白页面** - 从游戏界面点击返回游戏大厅时显示空白页面（有页头但无内容）
3. **重新加入Match失败** - 玩家离开Match后无法重新加入，报错"Player 0 not available" (409错误)
4. **游戏开始时机错误** - 缺乏人数检查，单人也能开始游戏

**当前修复状态：**
- 已应用代码修改，但需要用户测试确认效果
- 服务已重启，修改已部署

**相关文件：**
- `frontend/src/components/NewEnhancedLobby.js` - 新游戏大厅组件
- `frontend/src/components/GameView.js` - 游戏界面组件
- `api-server/routes/matches.js` - Match管理API
- `api-server/models/MatchPlayer.js` - 玩家座位管理

---

## 已解决的问题

### 2024-08-04 - Match管理系统重构 ✅
**状态：** 已解决
**解决方案：** 
1. 实现了完整的Match资源管理API（符合REST规范）
2. 添加了Toast消息提示系统替代原生弹窗
3. 实现了智能座位重用机制解决数据库约束冲突
4. 修复了boardgame.io Match ID不一致问题
5. 添加了Match生命周期管理功能

**相关文件：**
- `api-server/routes/matches.js` - 新的Match API
- `api-server/models/Match.js` - Match模型
- `api-server/models/MatchPlayer.js` - 玩家模型
- `frontend/src/components/MessageToast.js` - Toast组件
- `frontend/src/components/NewEnhancedLobby.js` - 重构的大厅组件

### 2024-08-04 - 原游戏大厅系统问题 ✅
**状态：** 已解决
**解决方案：** 
1. 修复了"未命名"玩家显示问题
2. 重新设计了Match创建流程（不自动加入创建者）
3. 实现了Match管理功能（删除、离开、清理）
4. 添加了完整的权限控制逻辑

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