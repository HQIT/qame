const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'boardgame_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'boardgame_db',
  password: process.env.DB_PASSWORD || 'boardgame_pass',
  port: process.env.DB_PORT || 5432,
  // 连接池配置
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时
  connectionTimeoutMillis: 2000, // 连接超时
});

// 测试数据库连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
});

// 执行数据库迁移
async function runMigrations() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 迁移文件目录
    const migrationsDir = path.join(__dirname, '../migrations');
    
    // 自动发现所有迁移文件并按数字前缀排序
    const allFiles = fs.readdirSync(migrationsDir);
    const migrationFiles = allFiles
      .filter(file => file.endsWith('.sql'))
      .filter(file => /^\d{3}_/.test(file)) // 必须以3位数字开头
      .sort((a, b) => {
        // 提取文件名前缀数字进行排序
        const numA = parseInt(a.substring(0, 3));
        const numB = parseInt(b.substring(0, 3));
        return numA - numB;
      });
    
    console.log(`📁 发现 ${migrationFiles.length} 个迁移文件:`, migrationFiles);
    
    for (const migrationFile of migrationFiles) {
      console.log(`🔄 执行迁移: ${migrationFile}`);
      const migrationPath = path.join(migrationsDir, migrationFile);
      
      // 检查文件是否存在
      if (!fs.existsSync(migrationPath)) {
        console.warn(`⚠️  迁移文件不存在: ${migrationPath}`);
        continue;
      }
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // 跳过空文件
      if (!migrationSQL.trim()) {
        console.log(`⏭️  跳过空迁移文件: ${migrationFile}`);
        continue;
      }
      
      // 执行迁移
      await pool.query(migrationSQL);
      console.log(`✅ 迁移完成: ${migrationFile}`);
    }
    
    console.log('✅ 所有数据库迁移执行成功');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    console.error('错误详情:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  runMigrations,
  query: (text, params) => pool.query(text, params),
}; 