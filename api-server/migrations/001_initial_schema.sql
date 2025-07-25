-- 初始数据库迁移脚本
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建游戏表
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 2,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建AI提供商表
CREATE TABLE IF NOT EXISTS ai_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建AI类型表
CREATE TABLE IF NOT EXISTS ai_types (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER REFERENCES ai_providers(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  endpoint VARCHAR(255) NOT NULL,
  config_schema JSONB DEFAULT '{}',
  supported_games TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, name)
);



-- 插入初始数据
INSERT INTO games (id, name, description, min_players, max_players) 
VALUES ('tic-tac-toe', '井字棋', '经典的井字棋游戏', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- 插入AI提供商
INSERT INTO ai_providers (id, name, description) VALUES 
(1, 'LLM Bot Demo', 'LLM Bot演示提供商'),
(2, 'Random AI', '随机AI提供商'),
(3, 'Minimax AI', 'Minimax算法AI提供商')
ON CONFLICT (id) DO NOTHING;

-- 插入AI类型
INSERT INTO ai_types (provider_id, name, description, endpoint, config_schema, supported_games) VALUES 
(1, 'LLM Bot', '基于大语言模型的AI', 'http://ai-provider:3001/api/llm-bot-v1/move', '{"model": "ecnu-max", "temperature": 0.7}', ARRAY['tic-tac-toe']),
(2, 'Random AI', '随机移动的AI', 'http://random-ai:3002/api/random/move', '{}', ARRAY['tic-tac-toe']),
(3, 'Minimax AI', '使用Minimax算法的AI', 'http://minimax-ai:3003/api/minimax/move', '{"depth": 5}', ARRAY['tic-tac-toe'])
ON CONFLICT (provider_id, name) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_ai_types_provider_id ON ai_types(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_types_status ON ai_types(status); 