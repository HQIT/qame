const { Client } = require('pg');
const EventEmitter = require('events');

/**
 * PostgreSQL数据库连接类
 */
class Database extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.connectionConfig = {
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'boardgame_db',
      user: process.env.DB_USER || 'boardgame_user',
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    };
  }

  /**
   * 连接到数据库
   */
  async connect() {
    try {
      this.client = new Client(this.connectionConfig);

      await this.client.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('✅ [Database] 数据库连接成功');
      
      this.client.on('error', (err) => {
        console.error('❌ [Database] 数据库连接错误:', err);
        this.isConnected = false;
        this.handleReconnect();
      });

      this.client.on('end', () => {
        console.log('🔌 [Database] 数据库连接已断开');
        this.isConnected = false;
        this.handleReconnect();
      });

      return this.client;
    } catch (error) {
      console.error('❌ [Database] 数据库连接失败:', error);
      this.isConnected = false;
      this.handleReconnect();
      throw error;
    }
  }

  /**
   * 处理重连逻辑
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [Database] 已达到最大重连次数 (${this.maxReconnectAttempts})，停止重连`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 [Database] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * 执行查询
   */
  async query(text, params) {
    if (!this.isConnected || !this.client) {
      throw new Error('数据库未连接');
    }
    
    try {
      return await this.client.query(text, params);
    } catch (error) {
      console.error('❌ [Database] 数据库查询错误:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.client) {
      try {
        await this.client.end();
        console.log('✅ [Database] 数据库连接已关闭');
      } catch (error) {
        console.error('❌ [Database] 关闭数据库连接时出错:', error);
      }
    }
    this.isConnected = false;
    this.client = null;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// 创建单例实例
const database = new Database();

module.exports = {
  Database,
  database
};