-- 添加用户角色字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- 创建角色索引
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 创建初始Admin用户（密码将从环境变量中获取）
-- 注意：这个INSERT语句会在应用启动时通过代码执行，而不是在这里直接执行
-- 这里只是为Admin用户预留位置 