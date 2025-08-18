FROM dockerpull.pw/node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制共享游戏包
COPY packages/ ./packages/

# 复制ai-manager的package.json并安装依赖
COPY ai-manager/package.json ./
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install --production

# 复制ai-manager源代码
COPY ai-manager/src ./src

# 暴露端口
EXPOSE 3002

# 启动应用
CMD ["npm", "start"]
