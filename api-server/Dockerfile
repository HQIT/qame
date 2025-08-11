FROM dockerpull.pw/node:18-alpine

WORKDIR /app

# 复制package.json
COPY package*.json ./

# 安装依赖
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 8001

# 启动应用
CMD ["npm", "start"] 