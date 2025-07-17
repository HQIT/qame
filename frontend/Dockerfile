# 构建阶段
FROM dockerpull.pw/node:18-alpine AS builder

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装所有依赖
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install

# 复制源代码
COPY . .

# 构建应用 - 使用构建参数
ARG REACT_APP_SERVER
ENV REACT_APP_SERVER=$REACT_APP_SERVER
RUN npm run build

# 生产阶段
FROM dockerpull.pw/node:18-alpine

WORKDIR /app

# 安装serve来提供静态文件服务
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install -g serve

# 从构建阶段复制构建结果
COPY --from=builder /app/build ./build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["serve", "-s", "build", "-l", "3000"] 