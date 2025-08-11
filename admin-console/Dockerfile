# 使用官方Node.js运行时作为基础镜像
FROM dockerpull.pw/node:18-alpine

RUN npm config set registry https://registry.npmmirror.com/

# 设置工作目录
WORKDIR /app

# 复制共享UI包
COPY packages/shared-ui /app/packages/shared-ui

# 构建shared-ui包
WORKDIR /app/packages/shared-ui

RUN npm install
RUN npm run build

# 切换回主工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY admin-console/package*.json ./

# 安装依赖
RUN npm install

# 复制前端源代码
COPY admin-console/src ./src
COPY admin-console/public ./public

# 复制后端源代码
COPY admin-console/server ./server

# 设置环境变量
ARG REACT_APP_API_SERVER
ARG REACT_APP_GAME_SERVER
ENV REACT_APP_API_SERVER=$REACT_APP_API_SERVER
ENV REACT_APP_GAME_SERVER=$REACT_APP_GAME_SERVER

# 构建前端应用
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动后端服务器（它会同时提供前端静态文件）
CMD ["npm", "run", "server"]