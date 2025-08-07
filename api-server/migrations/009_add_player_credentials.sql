-- 添加玩家认证凭证字段
-- 用于存储boardgame.io返回的playerCredentials，实现客户端连接认证

ALTER TABLE match_players ADD COLUMN IF NOT EXISTS player_credentials VARCHAR(255);

-- 添加注释
COMMENT ON COLUMN match_players.player_credentials IS 'boardgame.io返回的玩家认证凭证，用于客户端WebSocket连接验证';
