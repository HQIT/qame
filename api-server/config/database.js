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
    
    // 迁移文件列表（按顺序执行）
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_add_user_role.sql',
      '003_add_refresh_tokens.sql',
      '004_add_user_salt.sql',
      '005_update_existing_users_salt.sql',
      '006_remove_user_salt.sql',
      '007_add_match_tables.sql',
      '008_add_bgio_match_id.sql'
    ];
    
    for (const migrationFile of migrationFiles) {
      console.log(`🔄 执行迁移: ${migrationFile}`);
      const migrationPath = path.join(__dirname, '../migrations', migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // 执行迁移
      await pool.query(migrationSQL);
      console.log(`✅ 迁移完成: ${migrationFile}`);
    }
    
    console.log('✅ 所有数据库迁移执行成功');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  }
}

module.exports = {
  pool,
  runMigrations,
  query: (text, params) => pool.query(text, params),
}; 