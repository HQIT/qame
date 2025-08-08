const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
// 预设AI体系已移除；保持路由兼容但返回废弃信息

const router = express.Router();

// 所有Admin AI路由都需要先验证token，再验证Admin权限
router.use(authenticateToken);
router.use(requireAdmin);

module.exports = router; 