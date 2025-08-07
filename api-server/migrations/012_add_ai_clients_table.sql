-- 创建AI客户端状态表，用于持久化AI客户端信息
CREATE TABLE IF NOT EXISTS ai_clients (
    id VARCHAR(255) PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'created', -- created, connecting, connected, disconnected, error
    match_id VARCHAR(255),
    player_id VARCHAR(20),
    ai_config TEXT, -- JSON格式的AI配置
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建AI客户端索引
CREATE INDEX IF NOT EXISTS idx_ai_clients_last_seen ON ai_clients(last_seen);
CREATE INDEX IF NOT EXISTS idx_ai_clients_status ON ai_clients(status);
CREATE INDEX IF NOT EXISTS idx_ai_clients_game_type ON ai_clients(game_type);

-- 创建触发器来更新updated_at字段
DROP TRIGGER IF EXISTS update_ai_clients_updated_at ON ai_clients;
CREATE TRIGGER update_ai_clients_updated_at BEFORE UPDATE ON ai_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
