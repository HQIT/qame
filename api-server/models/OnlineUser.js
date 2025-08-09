const db = require('../config/database');
const Player = require('./Player');

class OnlineUser {
  /**
   * 更新用户在线状态（心跳）
   */
  static async updateHeartbeat(userId) {
    const query = `
      INSERT INTO user_online_status (user_id, last_heartbeat, online_since, updated_at)
      VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        last_heartbeat = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const result = await db.query(query, [userId]);
    
    // 同时更新对应的玩家状态为在线
    await Player.setUserOnline(userId);
    
    return result.rows[0];
  }

  /**
   * 获取所有在线用户（包括AI客户端，清理超时用户）
   */
  static async getOnlineUsers(timeoutMinutes = 5) {
    // 先清理超时用户
    await this.cleanupExpiredUsers(timeoutMinutes);
    
    // 使用统一的Player模型获取在线玩家，大大简化了查询逻辑
    return await Player.getOnlinePlayers();
  }

  /**
   * 获取在线用户统计（包括AI客户端）
   */
  static async getStats(timeoutMinutes = 5) {
    // 先清理超时用户
    await this.cleanupExpiredUsers(timeoutMinutes);
    
    // 使用统一的Player模型获取统计信息
    const playerStats = await Player.getStats();
    
    // 获取在线玩家数
    const onlinePlayers = await Player.getOnlinePlayers();
    const onlineCount = onlinePlayers.length;
    const playingCount = onlinePlayers.filter(p => p.match_id).length;
    const idleCount = onlineCount - playingCount;
    const adminCount = onlinePlayers.filter(p => p.role === 'admin').length;
    
    return {
      total: onlineCount,
      playing: playingCount,
      idle: idleCount,
      admin: adminCount,
      human_total: onlinePlayers.filter(p => p.player_type === 'human').length,
      ai_total: onlinePlayers.filter(p => p.player_type === 'ai').length
    };
  }

  /**
   * 用户下线
   */
  static async setOffline(userId) {
    const query = `DELETE FROM user_online_status WHERE user_id = $1 RETURNING *;`;
    const result = await db.query(query, [userId]);
    
    // 同时更新对应的玩家状态为离线
    await Player.setUserOffline(userId);
    
    return result.rows[0];
  }

  /**
   * 清理超时用户
   */
  static async cleanupExpiredUsers(timeoutMinutes = 5) {
    const query = `
      DELETE FROM user_online_status 
      WHERE last_heartbeat < CURRENT_TIMESTAMP - INTERVAL '${timeoutMinutes} minutes'
      RETURNING user_id;
    `;
    
    const result = await db.query(query);
    if (result.rows.length > 0) {
      console.log(`🧹 清理了 ${result.rows.length} 个超时用户`);
    }
    return result.rows;
  }

  /**
   * 根据用户ID查找在线用户
   */
  static async findByUserId(userId) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.role,
        uo.last_heartbeat,
        uo.online_since,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - uo.online_since))::INTEGER as online_duration,
        CASE 
          WHEN mp.id IS NOT NULL AND m.status IN ('waiting', 'ready', 'playing') THEN 'playing'
          ELSE 'idle'
        END as status,
        m.id as match_id,
        m.game_id,
        g.name as game_name,
        m.status as match_status
      FROM user_online_status uo
      JOIN users u ON uo.user_id = u.id
      LEFT JOIN match_players mp ON u.id = mp.user_id AND mp.status IN ('joined', 'ready', 'playing')
      LEFT JOIN matches m ON mp.match_id = m.id AND m.status IN ('waiting', 'ready', 'playing')
      LEFT JOIN games g ON m.game_id = g.id
      WHERE u.id = $1;
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = OnlineUser;
