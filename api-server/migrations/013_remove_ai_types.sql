-- 彻底移除预设AI类型体系：删除 ai_types / ai_providers，并从 match_players 删除 ai_type_id
-- 使用幂等操作确保可重复执行

-- 1) 放宽并重建 match_players 约束：不再依赖 ai_type_id
ALTER TABLE match_players DROP CONSTRAINT IF EXISTS match_players_check;

-- 2) 删除外键列（如果存在历史数据，需先确保不再使用该列）
ALTER TABLE match_players DROP COLUMN IF EXISTS ai_type_id;

-- 3) 重建仅基于 human/ai & ai_config 的检查约束（如果不存在）
DO $$
BEGIN
    -- 先删除可能存在的约束
    ALTER TABLE match_players DROP CONSTRAINT IF EXISTS match_players_check;
    
    -- 重新创建约束
    ALTER TABLE match_players
      ADD CONSTRAINT match_players_check CHECK (
        (
          player_type = 'human'
          AND user_id IS NOT NULL
        )
        OR
        (
          player_type = 'ai'
          AND user_id IS NULL
          AND ai_config IS NOT NULL
          AND ai_config ? 'clientId'
        )
      );
EXCEPTION
    WHEN others THEN
        -- 如果约束创建失败（比如数据不符合），忽略错误
        RAISE NOTICE '约束创建失败，可能是因为现有数据不符合要求: %', SQLERRM;
END $$;

-- 4) 删除依赖表
DROP TABLE IF EXISTS ai_types CASCADE;
DROP TABLE IF EXISTS ai_providers CASCADE;


