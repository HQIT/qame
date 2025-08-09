-- 创建统一的玩家表 - 重构player_type分离逻辑
-- 这个重构将大大简化代码复杂度

-- ========== 第一步：创建统一的玩家表 ==========
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    player_type VARCHAR(10) NOT NULL, -- 'human', 'ai'
    
    -- 类型特定的引用字段
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- human类型时使用
    ai_player_id INTEGER REFERENCES ai_players(id) ON DELETE CASCADE, -- ai类型时使用
    
    -- 统一的状态字段
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, offline
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT players_type_check CHECK (
        (player_type = 'human' AND user_id IS NOT NULL AND ai_player_id IS NULL) OR
        (player_type = 'ai' AND user_id IS NULL AND ai_player_id IS NOT NULL)
    ),
    
    -- 唯一约束：一个用户/AI只能有一个玩家身份
    UNIQUE(user_id),
    UNIQUE(ai_player_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_players_type ON players(player_type);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_ai_player_id ON players(ai_player_id);

-- 创建触发器来更新updated_at字段
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 第二步：迁移现有数据 ==========

-- 2.1 从users表创建human玩家
INSERT INTO players (player_name, player_type, user_id, status)
SELECT 
    u.username as player_name,
    'human' as player_type,
    u.id as user_id,
    CASE 
        WHEN uo.user_id IS NOT NULL THEN 'active'
        ELSE 'offline'
    END as status
FROM users u
LEFT JOIN user_online_status uo ON u.id = uo.user_id
ON CONFLICT (user_id) DO NOTHING;

-- 2.2 从ai_players表创建ai玩家
INSERT INTO players (player_name, player_type, ai_player_id, status)
SELECT 
    ap.player_name,
    'ai' as player_type,
    ap.id as ai_player_id,
    ap.status
FROM ai_players ap
ON CONFLICT (ai_player_id) DO NOTHING;

-- ========== 第三步：更新match_players表结构 ==========

-- 添加新的player_id字段
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS player_id INTEGER;

-- 迁移现有的match_players数据（只处理人类玩家，AI重构后另行处理）
UPDATE match_players mp 
SET player_id = (
    CASE 
        WHEN mp.player_type = 'human' AND mp.user_id IS NOT NULL THEN
            (SELECT p.id FROM players p WHERE p.user_id = mp.user_id LIMIT 1)
        ELSE NULL
    END
)
WHERE player_id IS NULL;

-- 添加外键约束（幂等性检查）
DO $$
BEGIN
    -- 检查约束是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_match_players_player' 
        AND table_name = 'match_players'
    ) THEN
        ALTER TABLE match_players 
        ADD CONSTRAINT fk_match_players_player 
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);

-- ========== 第四步：添加注释 ==========
COMMENT ON TABLE players IS '统一玩家表 - 包含所有类型的玩家（人类、AI等）';
COMMENT ON COLUMN players.player_type IS '玩家类型：human, ai';
COMMENT ON COLUMN players.user_id IS '人类玩家关联的用户ID';
COMMENT ON COLUMN players.ai_player_id IS 'AI玩家关联的AI玩家ID';
COMMENT ON COLUMN players.status IS '玩家状态：active, inactive, offline';
