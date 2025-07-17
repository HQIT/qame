# 构建阶段
FROM dockerpull.pw/node:18-alpine AS builder

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装所有依赖，使用官方源
RUN npm install

# 复制源代码
COPY . .

# 生产阶段
FROM dockerpull.pw/node:18-alpine

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 只安装生产依赖，使用官方源
RUN npm install --only=production

# 从构建阶段复制源代码
COPY --from=builder /app ./

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["npm", "start"] 