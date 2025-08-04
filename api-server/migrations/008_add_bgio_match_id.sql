-- 添加boardgame.io match ID字段
-- 用于存储boardgame.io服务器返回的真实match ID

ALTER TABLE matches ADD COLUMN IF NOT EXISTS bgio_match_id VARCHAR(50);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_matches_bgio_match_id ON matches(bgio_match_id);

-- 添加注释
COMMENT ON COLUMN matches.bgio_match_id IS 'boardgame.io服务器返回的真实match ID';