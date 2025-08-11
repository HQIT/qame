const express = require('express');
const bgioController = require('../controllers/bgioController');

const router = express.Router();

// 比赛管理
router.get('/matches', bgioController.getMatches);
router.get('/matches/:id', bgioController.getMatch);
router.delete('/matches/:id', bgioController.deleteMatch);

// 游戏状态管理
router.get('/game-states', bgioController.getGameStates);
router.get('/game-states/:matchId', bgioController.getGameState);
router.delete('/game-states/:matchId', bgioController.deleteGameState);



module.exports = router;
