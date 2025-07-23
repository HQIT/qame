-- 为users表添加salt字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'salt'
    ) THEN
        ALTER TABLE users ADD COLUMN salt VARCHAR(64) NOT NULL DEFAULT '';
    END IF;
END $$;

-- 为现有用户生成默认salt（如果需要的话）
-- 注意：现有用户的密码验证将需要重新设置 