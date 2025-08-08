const db = require('../config/database');

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
    return result.rows[0];
  }

  /**
   * 获取所有在线用户（包括AI客户端，清理超时用户）
   */
  static async getOnlineUsers(timeoutMinutes = 5) {
    // 先清理超时用户
    await this.cleanupExpiredUsers(timeoutMinutes);
    
    const query = `
      -- 人类用户
      SELECT 
        u.id::text as id,
        u.username,
        u.role,
        'human' as player_type,
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
        m.status as match_status,
        mp.id as match_player_id
      FROM user_online_status uo
      JOIN users u ON uo.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM match_players 
        WHERE user_id = u.id 
          AND status IN ('joined', 'ready', 'playing')
        ORDER BY id DESC 
        LIMIT 1
      ) mp ON true
      LEFT JOIN matches m ON mp.match_id = m.id AND m.status IN ('waiting', 'ready', 'playing')
      LEFT JOIN games g ON m.game_id = g.id
      
      UNION ALL
      
      -- AI客户端（如果ai_clients表存在）
      SELECT 
        ac.id,
        ac.player_name as username,
        'ai' as role,
        'ai' as player_type,
        ac.last_seen as last_heartbeat,
        ac.created_at as online_since,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ac.created_at))::INTEGER as online_duration,
        CASE 
          WHEN ac.status = 'connected' AND ac.match_id IS NOT NULL THEN 'playing'
          WHEN ac.status = 'connected' THEN 'idle'
          ELSE 'offline'
        END as status,
        ac.match_id,
        m.game_id,
        g.name as game_name,
        m.status as match_status,
        mp_ai.id as match_player_id
      FROM ai_clients ac
      LEFT JOIN matches m ON ac.match_id = m.id
      LEFT JOIN games g ON m.game_id = g.id
      LEFT JOIN match_players mp_ai ON mp_ai.match_id = ac.match_id 
        AND mp_ai.player_type = 'ai' 
        AND mp_ai.player_name = ac.player_name
      WHERE ac.status IN ('connected', 'connecting') 
        AND ac.last_seen > CURRENT_TIMESTAMP - INTERVAL '${timeoutMinutes} minutes'
      
      ORDER BY online_since ASC;
    `;
    
    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      // 如果ai_clients表不存在，只返回人类用户
      if (error.code === '42P01') { // relation does not exist
        console.log('ai_clients表不存在，只显示人类用户');
        const humanOnlyQuery = `
          SELECT 
            u.id::text as id,
            u.username,
            u.role,
            'human' as player_type,
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
            m.status as match_status,
            mp.id as match_player_id
          FROM user_online_status uo
          JOIN users u ON uo.user_id = u.id
          LEFT JOIN match_players mp ON u.id = mp.user_id AND mp.status IN ('joined', 'ready', 'playing')
          LEFT JOIN matches m ON mp.match_id = m.id AND m.status IN ('waiting', 'ready', 'playing')
          LEFT JOIN games g ON m.game_id = g.id
          ORDER BY uo.online_since ASC;
        `;
        const result = await db.query(humanOnlyQuery);
        return result.rows;
      }
      throw error;
    }
  }

  /**
   * 获取在线用户统计（包括AI客户端）
   */
  static async getStats(timeoutMinutes = 5) {
    // 先清理超时用户
    await this.cleanupExpiredUsers(timeoutMinutes);
    
    try {
      // 尝试包含AI客户端的统计查询
      const query = `
        WITH human_stats AS (
          SELECT 
            COUNT(*) as human_total,
            COUNT(CASE 
              WHEN mp.id IS NOT NULL AND m.status IN ('waiting', 'ready', 'playing') THEN 1 
            END) as human_playing,
            COUNT(CASE 
              WHEN mp.id IS NULL OR m.status NOT IN ('waiting', 'ready', 'playing') THEN 1 
            END) as human_idle,
            COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin
          FROM user_online_status uo
          JOIN users u ON uo.user_id = u.id
          LEFT JOIN LATERAL (
            SELECT * FROM match_players 
            WHERE user_id = u.id 
              AND status IN ('joined', 'ready', 'playing')
            ORDER BY id DESC 
            LIMIT 1
          ) mp ON true
          LEFT JOIN matches m ON mp.match_id = m.id AND m.status IN ('waiting', 'ready', 'playing')
        ),
        ai_stats AS (
          SELECT 
            COUNT(*) as ai_total,
            COUNT(CASE WHEN ac.match_id IS NOT NULL THEN 1 END) as ai_playing,
            COUNT(CASE WHEN ac.match_id IS NULL THEN 1 END) as ai_idle
          FROM ai_clients ac
          WHERE ac.status IN ('connected', 'connecting') 
            AND ac.last_seen > CURRENT_TIMESTAMP - INTERVAL '${timeoutMinutes} minutes'
        )
        SELECT 
          (human_total + ai_total) as total,
          (human_playing + ai_playing) as playing,
          (human_idle + ai_idle) as idle,
          admin,
          human_total,
          ai_total
        FROM human_stats, ai_stats;
      `;
      
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      // 如果ai_clients表不存在，回退到只统计人类用户
      if (error.code === '42P01') { // relation does not exist
        console.log('ai_clients表不存在，只统计人类用户');
        const humanOnlyQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE 
              WHEN mp.id IS NOT NULL AND m.status IN ('waiting', 'ready', 'playing') THEN 1 
            END) as playing,
            COUNT(CASE 
              WHEN mp.id IS NULL OR m.status NOT IN ('waiting', 'ready', 'playing') THEN 1 
            END) as idle,
            COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin,
            COUNT(*) as human_total,
            0 as ai_total
          FROM user_online_status uo
          JOIN users u ON uo.user_id = u.id
          LEFT JOIN LATERAL (
            SELECT * FROM match_players 
            WHERE user_id = u.id 
              AND status IN ('joined', 'ready', 'playing')
            ORDER BY id DESC 
            LIMIT 1
          ) mp ON true
          LEFT JOIN matches m ON mp.match_id = m.id AND m.status IN ('waiting', 'ready', 'playing');
        `;
        const result = await db.query(humanOnlyQuery);
        return result.rows[0];
      }
      throw error;
    }
  }

  /**
   * 用户下线
   */
  static async setOffline(userId) {
    const query = `DELETE FROM user_online_status WHERE user_id = $1 RETURNING *;`;
    const result = await db.query(query, [userId]);
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
