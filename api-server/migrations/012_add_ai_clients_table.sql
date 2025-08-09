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

-- 创建AI客户端索引（仅在对应字段存在时）
DO $$
BEGIN
    -- 只有当 last_seen 字段存在时才创建索引
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_clients' AND column_name='last_seen') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_clients_last_seen ON ai_clients(last_seen);
    END IF;
    
    -- 只有当 status 字段存在时才创建索引
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_clients' AND column_name='status') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_clients_status ON ai_clients(status);
    END IF;
    
    -- 只有当 game_type 字段存在时才创建索引
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_clients' AND column_name='game_type') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_clients_game_type ON ai_clients(game_type);
    END IF;
END $$;

-- 创建触发器来更新updated_at字段（仅在函数和字段都存在时）
DO $$
BEGIN
    -- 删除可能存在的旧触发器
    DROP TRIGGER IF EXISTS update_ai_clients_updated_at ON ai_clients;
    
    -- 只有当 updated_at 字段存在且函数存在时才创建触发器
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_clients' AND column_name='updated_at') 
       AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name='update_updated_at_column') THEN
        CREATE TRIGGER update_ai_clients_updated_at BEFORE UPDATE ON ai_clients
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
