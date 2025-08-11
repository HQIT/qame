# 构建阶段
FROM dockerpull.pw/node:18-alpine AS builder

WORKDIR /app

# 复制共享游戏包
COPY packages/ ./packages/

# 复制server的package.json
COPY server/package*.json ./

# 安装所有依赖，使用官方源
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install

# 复制server源代码
COPY server/ ./

# 生产阶段
FROM dockerpull.pw/node:18-alpine

WORKDIR /app

# 从构建阶段复制所有内容（包括node_modules）
COPY --from=builder /app ./

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["npm", "start"] 