-- 删除过时的match_players_check约束
-- 该约束是旧架构的遗留物，与新的统一玩家表架构冲突

-- 删除过时的检查约束
ALTER TABLE match_players DROP CONSTRAINT IF EXISTS match_players_check;

-- 添加注释说明为什么删除
COMMENT ON TABLE match_players IS '游戏对局玩家表 - 已移除过时的检查约束，数据完整性通过player_id外键保证';
