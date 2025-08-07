const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'boardgame_db',
  user: process.env.DB_USER || 'boardgame_user',
  password: process.env.DB_PASSWORD || 'boardgame_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 查询函数
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

module.exports = {
  query,
  pool
};
