-- 为现有用户生成salt值（幂等操作 - 只为空的salt生成）
UPDATE users 
SET salt = md5(random()::text || clock_timestamp()::text)
WHERE salt = '' OR salt IS NULL; 