# 项目问题记录

## 当前问题

### 2024-12-19 - 系统统计显示问题

**问题描述：**
管理员控制台中的系统统计显示用户数为0，但实际系统中至少有2个用户（hello和admin）。

**问题表现：**
1. 进入管理员控制台 > 系统统计
2. 用户数显示为0
3. 但实际数据库中应该有hello和admin两个用户

**可能原因：**
1. 统计API `/api/admin/stats` 的查询逻辑有问题
2. 数据库连接或查询语句有误
3. 统计API的权限验证有问题

**待解决：**
- 检查统计API的实现逻辑
- 验证数据库查询是否正确
- 确认API权限设置

**相关文件：**
- `api-server/routes/admin.js` - 统计API实现
- `api-server/models/User.js` - 用户模型
- `frontend/src/components/admin/SystemStats.js` - 前端统计组件

**优先级：** 中 - 影响管理员功能

---

## 已解决的问题

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