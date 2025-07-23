-- 移除不再需要的salt字段
-- 由于现在使用统一的salt策略，数据库中的salt字段不再需要

-- 删除salt字段
ALTER TABLE users DROP COLUMN IF EXISTS salt; 