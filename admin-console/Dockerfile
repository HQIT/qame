# 使用官方Node.js运行时作为基础镜像
FROM dockerpull.pw/node:18-alpine

RUN npm config set registry https://registry.npmmirror.com/

# 设置工作目录
WORKDIR /app

# 先复制所有包和package.json
COPY packages/shared-ui /app/packages/shared-ui
COPY packages/shared-utils /app/packages/shared-utils
COPY admin-console/package*.json ./

RUN npm install

WORKDIR /app/packages/shared-ui
RUN npm run build

# 切换回主工作目录，安装admin-console依赖
WORKDIR /app

# 复制前端源代码
COPY admin-console/src ./src
COPY admin-console/public ./public

# 设置环境变量
ARG REACT_APP_API_SERVER
ARG REACT_APP_GAME_SERVER
ARG REACT_APP_PASSWORD_SALT
ENV REACT_APP_API_SERVER=$REACT_APP_API_SERVER
ENV REACT_APP_GAME_SERVER=$REACT_APP_GAME_SERVER
ENV REACT_APP_PASSWORD_SALT=$REACT_APP_PASSWORD_SALT

# 构建前端应用
RUN npm run build

# 安装serve来提供静态文件
RUN npm install -g serve

# 暴露端口
EXPOSE 3001

# 启动静态文件服务器
CMD ["serve", "-s", "build", "-l", "3001"]