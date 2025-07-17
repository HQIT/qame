#!/bin/bash

echo "🎮 启动多人在线游戏平台..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查Docker是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker未运行，请启动Docker服务"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 创建.env文件（如果不存在）
if [ ! -f .env ]; then
    echo "📝 创建.env文件..."
    cat > .env << EOF
# 数据库配置
DATABASE_URL=postgresql://boardgame_user:boardgame_pass@postgres:5432/boardgame_db
REDIS_URL=redis://redis:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 服务器配置
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ .env文件已创建"
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 构建并启动服务
echo "🚀 构建并启动服务..."
docker-compose up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查健康状态
echo "🏥 检查健康状态..."
if curl -f http://localhost:8000/health &> /dev/null; then
    echo "✅ 后端服务运行正常"
else
    echo "⚠️  后端服务可能还在启动中，请稍等..."
fi

echo ""
echo "🎉 多人在线游戏平台启动完成！"
echo ""
echo "📱 访问地址："
echo "   前端应用: http://localhost"
echo "   后端API: http://localhost:8000"
echo "   健康检查: http://localhost:8000/health"
echo ""
echo "📋 常用命令："
echo "   查看日志: docker-compose logs"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo ""
echo "🎮 开始游戏吧！" 