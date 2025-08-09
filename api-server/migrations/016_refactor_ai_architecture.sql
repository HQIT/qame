-- 重构AI架构：分离AI客户端（服务注册）和AI玩家（玩家身份）

-- ========== 第一步：备份现有数据 ==========
CREATE TABLE IF NOT EXISTS ai_clients_backup AS SELECT * FROM ai_clients;

-- ========== 第二步：重构ai_clients表为AI服务注册表 ==========
-- 删除不需要的字段
ALTER TABLE ai_clients 
DROP COLUMN IF EXISTS player_name,
DROP COLUMN IF EXISTS game_type, 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS match_id,
DROP COLUMN IF EXISTS player_id,
DROP COLUMN IF EXISTS ai_config,
DROP COLUMN IF EXISTS last_seen,
DROP COLUMN IF EXISTS client_type,
DROP COLUMN IF EXISTS team_name,
DROP COLUMN IF EXISTS contact_info,
DROP COLUMN IF EXISTS llm_config_id;

-- 重命名id为client_id（如果需要的话，这里先保持id）
-- 添加新的字段
ALTER TABLE ai_clients 
ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 先更新现有记录，设置默认值（幂等操作）
UPDATE ai_clients 
SET 
  name = CASE 
    WHEN (name IS NULL OR name = '') AND (id = '' OR id IS NULL) THEN 'Default AI Client' 
    WHEN (name IS NULL OR name = '') THEN 'AI Client ' || id 
    ELSE name 
  END,
  endpoint = CASE 
    WHEN (endpoint IS NULL OR endpoint = '') THEN COALESCE(ai_endpoint, 'http://llm-ai-service:3003/move')
    ELSE endpoint
  END,

  description = CASE 
    WHEN (description IS NULL OR description = '') THEN 'Migrated AI client'
    ELSE description
  END
WHERE name IS NULL OR name = '' OR endpoint IS NULL OR endpoint = '';

-- supported_games 字段保持 TEXT[] 数组类型（性能更好，查询更方便）
-- 索引在014迁移中处理，这里跳过避免冲突

-- 删除ai_endpoint字段（已经移到endpoint）
ALTER TABLE ai_clients DROP COLUMN IF EXISTS ai_endpoint;

-- 删除旧约束
ALTER TABLE ai_clients DROP CONSTRAINT IF EXISTS ai_clients_type_check;

-- 添加新约束（先删除可能存在的）
ALTER TABLE ai_clients DROP CONSTRAINT IF EXISTS ai_clients_name_check;
ALTER TABLE ai_clients DROP CONSTRAINT IF EXISTS ai_clients_endpoint_check;
ALTER TABLE ai_clients 
ADD CONSTRAINT ai_clients_name_check CHECK (name != ''),
ADD CONSTRAINT ai_clients_endpoint_check CHECK (endpoint != '');

-- ========== 第三步：创建ai_players表 ==========
CREATE TABLE IF NOT EXISTS ai_players (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    ai_client_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    CONSTRAINT fk_ai_players_client FOREIGN KEY (ai_client_id) REFERENCES ai_clients(id) ON DELETE CASCADE,
    
    -- 唯一约束
    CONSTRAINT uq_ai_players_name UNIQUE (player_name)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_players_client_id ON ai_players(ai_client_id);
CREATE INDEX IF NOT EXISTS idx_ai_players_status ON ai_players(status);

-- 创建触发器
DROP TRIGGER IF EXISTS update_ai_players_updated_at ON ai_players;
CREATE TRIGGER update_ai_players_updated_at BEFORE UPDATE ON ai_players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 第四步：删除不再需要的表 ==========
-- 删除LLM配置表（如果存在）
DROP TABLE IF EXISTS llm_configs;

-- ========== 第五步：添加注释 ==========
COMMENT ON TABLE ai_clients IS 'AI客户端服务注册表，存储AI服务的基本信息';
COMMENT ON COLUMN ai_clients.id IS 'AI客户端唯一标识符';
COMMENT ON COLUMN ai_clients.name IS 'AI客户端显示名称';
COMMENT ON COLUMN ai_clients.endpoint IS 'AI客户端的/move接口地址';
COMMENT ON COLUMN ai_clients.supported_games IS '支持的游戏列表，JSON格式';
COMMENT ON COLUMN ai_clients.description IS 'AI客户端描述，包含团队信息等';

COMMENT ON TABLE ai_players IS 'AI玩家表，存储基于AI客户端创建的玩家身份';
COMMENT ON COLUMN ai_players.player_name IS 'AI玩家显示名称';
COMMENT ON COLUMN ai_players.ai_client_id IS '关联的AI客户端ID';
COMMENT ON COLUMN ai_players.status IS 'AI玩家状态：active, inactive';
