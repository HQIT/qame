const { LLMAdapter } = require('./LLMAdapter');

class LLMService {
  constructor(config) {
    this.config = config;
    this.adapter = new LLMAdapter(config);
  }

  async getMove(gameAnalysis) {
    try {
      console.log('🤖 [LLM Service] 获取移动决策');
      
      // 使用适配器调用第三方LLM
      const move = await this.adapter.getMove(gameAnalysis);
      
      if (move !== null && this.isValidMove(move, gameAnalysis)) {
        console.log('✅ [LLM Service] 获取到有效移动:', move);
        return move;
      } else {
        console.warn('⚠️ [LLM Service] LLM返回的移动无效，使用fallback');
        return this.getFallbackMove(gameAnalysis);
      }
    } catch (error) {
      console.error('❌ [LLM Service] 获取移动失败:', error);
      return this.getFallbackMove(gameAnalysis);
    }
  }

  isValidMove(move, gameAnalysis) {
    if (typeof move !== 'number' || move < 0) {
      return false;
    }
    
    // 检查移动是否在可用移动列表中
    return gameAnalysis.availableMoves && gameAnalysis.availableMoves.includes(move);
  }

  getFallbackMove(gameAnalysis) {
    const { availableMoves, winningMoves, blockingMoves } = gameAnalysis;
    
    // 1. 优先选择获胜移动
    if (winningMoves && winningMoves.length > 0) {
      return winningMoves[0];
    }
    
    // 2. 阻止对手获胜
    if (blockingMoves && blockingMoves.length > 0) {
      return blockingMoves[0];
    }
    
    // 3. 选择第一个可用移动
    if (availableMoves && availableMoves.length > 0) {
      return availableMoves[0];
    }
    
    return null;
  }
}

module.exports = { LLMService };
