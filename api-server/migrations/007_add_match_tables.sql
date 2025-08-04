-- 添加Match管理表
-- 创建matches表
CREATE TABLE IF NOT EXISTS matches (
  id VARCHAR(50) PRIMARY KEY,                    -- match ID (与boardgame.io一致)
  game_id VARCHAR(50) NOT NULL REFERENCES games(id),
  creator_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'waiting',          -- waiting, ready, playing, finished, cancelled
  max_players INTEGER NOT NULL,
  min_players INTEGER NOT NULL,
  allow_spectators BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  auto_start BOOLEAN DEFAULT false,
  game_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

-- 创建match_players表
CREATE TABLE IF NOT EXISTS match_players (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(50) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seat_index INTEGER NOT NULL,                   -- 座位索引 (0-based)
  player_type VARCHAR(10) NOT NULL,              -- 'human' 或 'ai'
  user_id INTEGER REFERENCES users(id),          -- 人类玩家的用户ID
  ai_type_id INTEGER REFERENCES ai_types(id),    -- AI玩家的AI类型ID
  player_name VARCHAR(100) NOT NULL,             -- 显示名称
  status VARCHAR(20) DEFAULT 'joined',           -- joined, ready, playing, left
  ai_config JSONB DEFAULT '{}',                  -- AI配置
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  UNIQUE(match_id, seat_index),
  CHECK (
    (player_type = 'human' AND user_id IS NOT NULL AND ai_type_id IS NULL) OR
    (player_type = 'ai' AND user_id IS NULL AND ai_type_id IS NOT NULL)
  )
);

-- 创建match状态历史表
CREATE TABLE IF NOT EXISTS match_status_history (
  id SERIAL PRIMARY KEY,
  match_id VARCHAR(50) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_matches_game_id ON matches(game_id);
CREATE INDEX IF NOT EXISTS idx_matches_creator_id ON matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_match_players_status ON match_players(status);

-- 创建触发器函数来更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为matches表创建触发器（如果不存在）
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();