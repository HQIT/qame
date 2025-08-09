-- 简化AI客户端管理，支持内部AI（基于LLM）和外部AI（独立端点）

-- 为ai_clients表增加类型字段
ALTER TABLE ai_clients 
ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'internal';  -- internal, external

-- 为外部AI增加团队信息字段
ALTER TABLE ai_clients
ADD COLUMN IF NOT EXISTS team_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255);

-- 更新现有数据，确保所有记录都有client_type（幂等操作）
UPDATE ai_clients 
SET client_type = 'internal' 
WHERE client_type IS NULL OR client_type = '';

-- 为现有的内部AI记录设置默认的ai_endpoint（如果还没有）（幂等操作）
UPDATE ai_clients 
SET ai_endpoint = 'http://llm-ai-service:3003'
WHERE (client_type = 'internal' OR client_type IS NULL) 
  AND (ai_endpoint IS NULL OR ai_endpoint = '');

-- 修改约束：外部AI客户端不需要LLM配置
ALTER TABLE ai_clients 
DROP CONSTRAINT IF EXISTS ai_clients_llm_config_check;

-- 先删除可能存在的旧约束
ALTER TABLE ai_clients 
DROP CONSTRAINT IF EXISTS ai_clients_type_check;

-- 创建新的约束：
-- 内部AI或外部AI都必须有AI端点（统一接口设计）
ALTER TABLE ai_clients
ADD CONSTRAINT ai_clients_type_check CHECK (
  ai_endpoint IS NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_clients_client_type ON ai_clients(client_type);

-- 添加注释
COMMENT ON COLUMN ai_clients.client_type IS 'AI客户端类型: internal(内部基于LLM), external(外部独立实现)';
COMMENT ON COLUMN ai_clients.team_name IS '外部AI团队名称';
COMMENT ON COLUMN ai_clients.contact_info IS '外部AI联系方式';
