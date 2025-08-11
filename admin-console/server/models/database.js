const { Sequelize } = require('sequelize');

// 数据库配置
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'boardgame_db',
  username: process.env.DB_USER || 'boardgame_user',
  password: process.env.DB_PASSWORD,
  dialect: 'postgresql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
