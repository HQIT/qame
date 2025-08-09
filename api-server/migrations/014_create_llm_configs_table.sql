-- 创建LLM配置表
-- 这个表只存储纯粹的LLM技术参数，不包含游戏相关配置
CREATE TABLE IF NOT EXISTS llm_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- LLM API配置
    endpoint VARCHAR(500) NOT NULL,  -- LLM API端点 (如: https://api.openai.com/v1/chat/completions)
    api_key VARCHAR(500) NOT NULL,   -- API密钥
    model VARCHAR(100) NOT NULL,     -- 模型名称 (如: gpt-3.5-turbo)
    
    -- LLM参数
    max_tokens INTEGER DEFAULT 100,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    system_prompt TEXT DEFAULT '你是一个聪明的游戏AI助手。请分析游戏状态并选择最佳移动。',
    
    -- 超时配置
    timeout_ms INTEGER DEFAULT 10000,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active',  -- active, inactive
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_llm_configs_name ON llm_configs(name);
CREATE INDEX IF NOT EXISTS idx_llm_configs_status ON llm_configs(status);

-- 修改ai_clients表，添加AI端点配置和LLM配置引用
ALTER TABLE ai_clients 
ADD COLUMN IF NOT EXISTS llm_config_id INTEGER REFERENCES llm_configs(id),
ADD COLUMN IF NOT EXISTS ai_endpoint VARCHAR(500),  -- AI客户端的接口端点 (供ai-manager调用)
ADD COLUMN IF NOT EXISTS supported_games TEXT[] DEFAULT '{}';  -- 支持的游戏列表

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_clients_llm_config_id ON ai_clients(llm_config_id);

-- 跳过 supported_games 索引创建，避免类型冲突（性能影响很小）

-- 添加注释
COMMENT ON TABLE llm_configs IS 'LLM配置表 - 存储纯粹的LLM技术参数';
COMMENT ON COLUMN llm_configs.endpoint IS 'LLM API端点，如OpenAI、Claude等';
COMMENT ON COLUMN ai_clients.ai_endpoint IS 'AI客户端接口端点，供ai-manager调用';
COMMENT ON COLUMN ai_clients.supported_games IS 'AI客户端支持的游戏列表';
