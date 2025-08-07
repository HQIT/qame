-- 清理不再使用的rooms和room_seats表
-- 现在使用matches和match_players表来管理游戏房间

-- 删除room_seats表
DROP TABLE IF EXISTS room_seats CASCADE;

-- 删除rooms表  
DROP TABLE IF EXISTS rooms CASCADE;

-- 相关的索引会自动删除

-- 输出清理信息
SELECT 'rooms和room_seats表已清理完成' as message;
