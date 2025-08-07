# 🤖 AI玩家管理中心

AI客户端管理服务，提供图形化界面管理AI玩家、LLM配置和批量操作。

## 🚀 功能特性

### 1. 图形化管理界面
- **实时监控**: 查看所有AI客户端状态
- **可视化操作**: 通过Web界面创建、停止AI客户端
- **统计信息**: 实时显示AI客户端数量、状态分布等

### 2. LLM配置管理
- **多LLM支持**: 支持配置多个LLM提供商
- **API密钥管理**: 安全存储和使用API密钥
- **提示词定制**: 为不同游戏类型配置专门的提示词
- **模型选择**: 支持指定模型名称、token数、温度参数等

### 3. 批量AI玩家管理
- **批量创建**: 一次性创建多个AI玩家
- **智能分配**: 根据游戏类型自动选择合适的AI配置
- **进度跟踪**: 实时显示批量操作的进度和结果

## 📦 架构设计

```
ai-manager/
├── src/
│   ├── server.js           # 主服务器
│   ├── AIClientManager.js  # AI客户端管理器
│   └── routes/
│       └── api.js          # API路由
├── public/
│   ├── index.html          # 管理界面
│   └── app.js              # 前端逻辑
├── package.json
├── Dockerfile
└── README.md
```

## 🛠️ 使用方法

### 访问管理界面

启动服务后，访问管理界面：
```
https://your-domain/ai-manager/
```

### API接口

#### AI客户端管理
- `GET /api/clients` - 获取所有AI客户端
- `POST /api/clients` - 创建AI客户端
- `DELETE /api/clients/:id` - 停止AI客户端
- `POST /api/clients/batch` - 批量创建AI客户端

#### LLM配置管理
- `GET /api/llm-configs` - 获取所有LLM配置
- `POST /api/llm-configs` - 创建LLM配置
- `PUT /api/llm-configs/:id` - 更新LLM配置
- `DELETE /api/llm-configs/:id` - 删除LLM配置

#### 统计信息
- `GET /api/stats` - 获取系统统计
- `GET /api/health` - 健康检查

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `3002` |
| `GAME_SERVER_URL` | 游戏服务器地址 | `http://game-server:8000` |

### LLM配置参数

创建LLM配置时支持以下参数：

- **name**: 配置名称
- **endpoint**: API端点地址
- **apiKey**: API密钥（可选）
- **model**: 模型名称
- **maxTokens**: 最大token数
- **temperature**: 温度参数 (0-2)
- **systemPrompt**: 系统提示词
- **gamePrompts**: 游戏特定提示词

### AI类型配置

支持的AI类型：

- **basic**: 基础AI - 适合简单游戏
- **strategic**: 策略AI - 适合中等复杂度游戏
- **advanced**: 高级AI - 适合复杂游戏

## 📋 操作指南

### 1. 创建AI客户端

1. 点击"创建AI客户端"按钮
2. 填写玩家名称
3. 选择游戏类型和AI类型
4. 选择LLM配置
5. 点击"创建"

### 2. 配置LLM

1. 切换到"LLM配置"标签
2. 点击"添加LLM配置"
3. 填写配置信息：
   - API端点地址
   - API密钥（如果需要）
   - 模型参数
   - 提示词
4. 点击"添加"

### 3. 批量操作

1. 切换到"批量操作"标签
2. 设置创建数量（1-10个）
3. 选择游戏类型、AI类型和LLM配置
4. 点击"批量创建"
5. 查看操作结果

## 🔍 监控和调试

### 客户端状态

- **running**: 运行中
- **stopped**: 已停止
- **crashed**: 已崩溃
- **starting**: 启动中
- **stopping**: 停止中

### 日志查看

可以在客户端详情中查看AI客户端的运行日志，用于调试和监控。

### 统计信息

实时显示：
- 总AI客户端数
- 各状态客户端数量
- LLM配置数量
- AI类型数量

## 🚨 注意事项

1. **资源管理**: 大量AI客户端会消耗较多系统资源，建议根据服务器性能控制数量
2. **API配额**: 使用外部LLM服务时注意API调用配额限制
3. **网络连接**: 确保AI客户端能正常连接到游戏服务器
4. **日志清理**: 长时间运行的客户端会产生大量日志，注意清理

## 🔗 相关链接

- [AI客户端文档](../ai-client/README.md)
- [游戏服务器文档](../server/README.md)
- [前端应用文档](../frontend/README.md)
