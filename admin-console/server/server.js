const app = require('./app');
const db = require('./models/database');

const PORT = process.env.PORT || 3001;

// 数据库连接
db.authenticate()
  .then(() => {
    console.log('✅ 数据库连接成功');
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 Admin Console 服务器运行在端口 ${PORT}`);
      console.log(`📊 管理控制台: http://localhost:${PORT}`);
      console.log(`🔗 API接口: http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📝 接收到 SIGTERM 信号，正在优雅关闭...');
  db.close()
    .then(() => {
      console.log('✅ 数据库连接已关闭');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 关闭数据库连接失败:', err);
      process.exit(1);
    });
});
