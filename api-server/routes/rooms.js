const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Room = require('../models/Room');
const RoomSeat = require('../models/RoomSeat');
const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取房间列表
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.findAll();
    res.json({
      code: 200,
      message: '获取房间列表成功',
      data: rooms
    });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取房间列表失败',
      data: null
    });
  }
});

// 创建新房间
router.post('/', async (req, res) => {
  try {
    const { gameId, name, maxPlayers } = req.body;
    
    // 参数验证
    if (!gameId || !name || !maxPlayers) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null
      });
    }

    if (maxPlayers < 2 || maxPlayers > 4) {
      return res.status(400).json({
        code: 400,
        message: '玩家数量必须在2-4之间',
        data: null
      });
    }

    const room = await Room.create(gameId, name, maxPlayers, req.user.id);
    
    res.json({
      code: 200,
      message: '创建房间成功',
      data: room
    });
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建房间失败',
      data: null
    });
  }
});

// 获取房间详情
router.get('/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const room = await Room.findById(roomId);
    
    if (!room) {
      return res.status(404).json({
        code: 404,
        message: '房间不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      message: '获取房间详情成功',
      data: room
    });
  } catch (error) {
    console.error('获取房间详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取房间详情失败',
      data: null
    });
  }
});

// 删除房间（只有创建者可以删除）
router.delete('/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const room = await Room.findById(roomId);
    
    if (!room) {
      return res.status(404).json({
        code: 404,
        message: '房间不存在',
        data: null
      });
    }

    if (room.created_by !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '只有房间创建者可以删除房间',
        data: null
      });
    }

    await Room.delete(roomId);
    
    res.json({
      code: 200,
      message: '删除房间成功',
      data: null
    });
  } catch (error) {
    console.error('删除房间失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除房间失败',
      data: null
    });
  }
});

// 加入座位
router.post('/:id/seats/:seatNumber/join', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const seatNumber = parseInt(req.params.seatNumber);
    
    const seat = await RoomSeat.joinSeat(roomId, seatNumber, req.user.id);
    
    res.json({
      code: 200,
      message: '加入座位成功',
      data: seat
    });
  } catch (error) {
    console.error('加入座位失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '加入座位失败',
      data: null
    });
  }
});

// 离开座位
router.post('/:id/seats/:seatNumber/leave', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const seatNumber = parseInt(req.params.seatNumber);
    
    const seat = await RoomSeat.leaveSeat(roomId, seatNumber, req.user.id);
    
    res.json({
      code: 200,
      message: '离开座位成功',
      data: seat
    });
  } catch (error) {
    console.error('离开座位失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '离开座位失败',
      data: null
    });
  }
});

// 设置AI座位
router.post('/:id/seats/:seatNumber/ai', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const seatNumber = parseInt(req.params.seatNumber);
    const { aiTypeId } = req.body;
    
    if (!aiTypeId) {
      return res.status(400).json({
        code: 400,
        message: '缺少AI类型ID',
        data: null
      });
    }

    const seat = await RoomSeat.setAISeat(roomId, seatNumber, aiTypeId);
    
    res.json({
      code: 200,
      message: '设置AI座位成功',
      data: seat
    });
  } catch (error) {
    console.error('设置AI座位失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '设置AI座位失败',
      data: null
    });
  }
});

// 移除AI座位
router.delete('/:id/seats/:seatNumber/ai', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const seatNumber = parseInt(req.params.seatNumber);
    
    const seat = await RoomSeat.removeAISeat(roomId, seatNumber);
    
    res.json({
      code: 200,
      message: '移除AI座位成功',
      data: seat
    });
  } catch (error) {
    console.error('移除AI座位失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '移除AI座位失败',
      data: null
    });
  }
});

module.exports = router; 