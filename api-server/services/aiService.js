const { request } = require('undici');
const { query } = require('../config/database');

class AIService {
  
  // 解析AI返回的移动位置
  static parseMoveResponse(response) {
    const move = response.move;
    
    if (move === undefined || move === null) {
      throw new Error('AI返回的移动位置无效');
    }
    
    if (typeof move !== 'number' || move < 0 || move > 8) {
      throw new Error('AI返回的移动位置超出范围');
    }
    
    return move;
  }
  
  // 获取fallback移动（当AI调用失败时）
  static getFallbackMove(gameState) {
    // 简单的fallback策略：找到第一个可用位置
    const cells = gameState.cells || [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === null) {
        return i;
      }
    }
    return -1; // 没有可用位置
  }
}

module.exports = AIService; 