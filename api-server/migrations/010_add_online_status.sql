-- 添加用户在线状态表（简化版，利用现有的用户和match_players表）
CREATE TABLE IF NOT EXISTS user_online_status (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    online_since TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_online_status_last_heartbeat ON user_online_status(last_heartbeat);

-- 创建触发器来更新updated_at字段
DROP TRIGGER IF EXISTS update_user_online_status_updated_at ON user_online_status;
CREATE TRIGGER update_user_online_status_updated_at BEFORE UPDATE ON user_online_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
