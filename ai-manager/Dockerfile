FROM dockerpull.pw/node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json并安装依赖
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install --production

# 复制源代码
COPY . .

# 使用root用户运行，简化Docker权限管理

# 暴露端口
EXPOSE 3002

# 启动应用
CMD ["npm", "start"]
