FROM dockerpull.pw/node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 配置npm中国大陆加速镜像并安装依赖
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install --only=production

# 复制源代码
COPY src/ ./src/

# 暴露端口
EXPOSE 3003

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const req = http.request('http://localhost:3003/health', res => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# 启动应用
CMD ["npm", "start"]
