# 项目问题记录

## 当前问题

### 2024-12-19 - 登录持久化问题

**问题描述：**
用户登录后，刷新浏览器页面需要重新登录，无法保持登录状态。

**问题表现：**
1. 用户成功登录后，sessionStorage中保存了用户信息
2. 刷新浏览器页面后，sessionStorage被清空
3. 前端检测到sessionStorage为空，要求用户重新登录
4. 但实际上Cookie中的JWT token仍然有效

**已尝试的解决方案：**
1. 修改了 `frontend/src/App.js` 中的认证逻辑
2. 改为始终验证Cookie中的token，不依赖sessionStorage
3. 但问题仍然存在

**技术细节：**
- 前端使用React + sessionStorage存储用户信息
- 后端使用JWT token存储在HttpOnly Cookie中
- 刷新页面时sessionStorage被清空，但Cookie中的token仍然有效
- 需要找到正确的token验证和用户状态恢复机制

**待解决：**
- 需要进一步调试token验证API是否正常工作
- 检查Cookie是否正确设置和传递
- 验证前端认证逻辑是否正确处理token验证响应

**相关文件：**
- `frontend/src/App.js` - 前端认证逻辑
- `api-server/routes/auth.js` - 后端认证API
- `frontend/src/components/Login.js` - 登录组件

**优先级：** 高 - 影响用户体验

---

## 已解决的问题

### 2024-12-19 - 管理员控制台用户管理问题
**状态：** 已解决
**解决方案：** 修改前端认证方式，使用Cookie而不是sessionStorage进行API调用

### 2024-12-19 - 用户注册功能移除
**状态：** 已解决
**解决方案：** 移除了用户注册API和相关前端功能，添加了明确的文档说明

### 2024-12-19 - 密码哈希统一盐值
**状态：** 已解决
**解决方案：** 使用统一的盐值进行密码哈希，移除了用户特定的盐值字段 