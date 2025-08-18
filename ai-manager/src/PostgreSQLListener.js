const { database } = require('./database');
const EventEmitter = require('events');

/**
 * PostgreSQL LISTEN/NOTIFY 监听器
 * 监听数据库通知并触发相应的事件
 */
class PostgreSQLListener extends EventEmitter {
  constructor() {
    super();
    this.database = database;
    this.channels = new Set(); // 存储已监听的频道
  }
  
  /**
   * 连接到数据库并设置监听
   */
  async connect() {
    await this.database.connect();
    
    // 监听数据库通知
    this.database.client.on('notification', (msg) => {
      this.handleNotification(msg);
    });
  }

  /**
   * 获取连接状态
   */
  get isConnected() {
    return this.database.isConnected;
  }

  /**
   * 监听指定频道
   */
  async listen(channel) {
    if (!this.isConnected || !this.database.client) {
      throw new Error('数据库监听器未连接');
    }

    try {
      await this.database.client.query(`LISTEN ${channel}`);
      this.channels.add(channel);
      console.log(`🔔 开始监听频道: ${channel}`);
    } catch (error) {
      console.error(`❌ 监听频道 ${channel} 失败:`, error);
      throw error;
    }
  }

  /**
   * 停止监听指定频道
   */
  async unlisten(channel) {
    if (!this.isConnected || !this.database.client) {
      return;
    }

    try {
      await this.database.client.query(`UNLISTEN ${channel}`);
      this.channels.delete(channel);
      console.log(`🔕 停止监听频道: ${channel}`);
    } catch (error) {
      console.error(`❌ 停止监听频道 ${channel} 失败:`, error);
    }
  }

  /**
   * 处理数据库通知
   */
  handleNotification(msg) {
    try {
      const { channel, payload } = msg;
      console.log(`📨 收到通知 [${channel}]:`, payload);
      
      // 尝试解析JSON载荷
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (parseError) {
        console.warn(`⚠️ 无法解析JSON载荷:`, payload);
        parsedPayload = { raw: payload };
      }

      // 发出事件
      this.emit('notification', {
        channel,
        payload: parsedPayload,
        raw: payload,
        timestamp: new Date()
      });

      // 发出特定频道的事件
      this.emit(`notification:${channel}`, {
        payload: parsedPayload,
        raw: payload,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ 处理通知时出错:`, error);
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    // 停止监听所有频道
    for (const channel of this.channels) {
      try {
        await this.database.client.query(`UNLISTEN ${channel}`);
      } catch (error) {
        console.error(`❌ 停止监听频道 ${channel} 失败:`, error);
      }
    }
    this.channels.clear();
    await this.database.close();
  }

  /**
   * 获取监听器状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      channels: Array.from(this.channels)
    };
  }

  /**
   * 发送测试通知（用于调试）
   */
  async sendTestNotification(channel, payload) {
    if (!this.isConnected || !this.database.client) {
      throw new Error('数据库监听器未连接');
    }

    try {
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      await this.database.client.query('SELECT pg_notify($1, $2)', [channel, payloadStr]);
      console.log(`📤 发送测试通知到 ${channel}:`, payload);
    } catch (error) {
      console.error(`❌ 发送测试通知失败:`, error);
      throw error;
    }
  }
}

module.exports = PostgreSQLListener;