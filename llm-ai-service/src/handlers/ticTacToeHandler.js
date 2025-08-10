/**
 * 井字棋游戏处理器
 * 实现标准的 /move 接口逻辑
 */

class TicTacToeHandler {
  /**
   * 获取AI移动决策
   * @param {LLMAIService} llmAI - LLM AI服务实例
   * @param {object} G - boardgame.io游戏数据
   * @param {object} metadata - 元数据
   * @returns {Promise<number>} 移动位置
   */
  async getMove(llmAI, G, metadata = {}) {
    try {
      // 计算有效移动
      const validMoves = this.calculateValidMoves(G.cells);
      
      if (validMoves.length === 0) {
        console.warn('⚠️ [井字棋] 没有有效移动');
        return -1;
      }
      
      // 生成游戏状态描述的提示词
      const prompt = this.generatePrompt(G, validMoves, metadata);
      
      console.log('🎯 [井字棋] 生成提示词:', prompt);
      
      // 调用LLM获取移动
      const move = await llmAI.getAIMove(prompt);
      
      // 验证移动是否有效
      if (!this.isValidMove(move, validMoves)) {
        console.warn(`⚠️ [井字棋] LLM返回无效移动 ${move}, 有效移动: ${validMoves}`);
        
        // 如果LLM返回无效移动，随机选择一个有效移动
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        const fallbackMove = validMoves[randomIndex];
        
        console.log(`🎲 [井字棋] 使用随机移动: ${fallbackMove}`);
        return fallbackMove;
      }
      
      console.log(`✅ [井字棋] LLM选择移动: ${move}`);
      return move;
      
    } catch (error) {
      console.error('❌ [井字棋] 处理移动失败:', error);
      
      // 发生错误时随机选择移动
      if (validMoves && validMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        const fallbackMove = validMoves[randomIndex];
        console.log(`🎲 [井字棋] 错误回退，随机移动: ${fallbackMove}`);
        return fallbackMove;
      }
      
      return -1;
    }
  }

  /**
   * 计算有效移动
   * @param {array} cells - 棋盘状态数组
   * @returns {array} 有效移动位置数组
   */
  calculateValidMoves(cells) {
    const validMoves = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === null || cells[i] === undefined) {
        validMoves.push(i);
      }
    }
    return validMoves;
  }

  /**
   * 验证移动是否有效
   * @param {number} move - 移动位置
   * @param {array} validMoves - 有效移动列表
   * @returns {boolean} 是否有效
   */
  isValidMove(move, validMoves) {
    return validMoves.includes(move);
  }

  /**
   * 生成LLM提示词
   * @param {object} G - boardgame.io游戏数据
   * @param {array} validMoves - 有效移动列表
   * @param {object} metadata - 元数据
   * @returns {string} 提示词
   */
  generatePrompt(G, validMoves, metadata) {
    const { cells } = G;
    const { move_number = 0 } = metadata;
    
    // 将棋盘状态转换为可读格式
    const board = this.formatBoard(cells);
    
    const prompt = `
当前井字棋棋盘状态：
${board}

图例：X = 玩家X，O = 玩家O，数字 = 可选位置

可选移动位置：${validMoves.join(', ')}
当前移动轮次：${move_number + 1}

请分析棋盘状态，选择最佳移动位置。优先考虑：
1. 如果能获胜，立即选择获胜位置
2. 如果对手下一步能获胜，阻挡对手
3. 选择战略性最好的位置（中心 > 角落 > 边缘）

请只返回一个数字（0-8），表示你选择的位置。
`;

    return prompt.trim();
  }

  /**
   * 格式化棋盘为可读形式
   * @param {array} cells - 棋盘状态数组
   * @returns {string} 格式化的棋盘
   */
  formatBoard(cells) {
    const display = cells.map((cell, index) => {
      if (cell === null) return index.toString();
      return cell;
    });

    return `
 ${display[0]} | ${display[1]} | ${display[2]} 
-----------
 ${display[3]} | ${display[4]} | ${display[5]} 
-----------
 ${display[6]} | ${display[7]} | ${display[8]} 
`;
  }

  /**
   * 分析游戏状态（可选，用于更高级的策略）
   * @param {array} cells - 棋盘状态
   * @param {string} player - 当前玩家 ('X' 或 'O')
   * @returns {object} 分析结果
   */
  analyzeGameState(cells, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    
    // 检查获胜机会
    const winMove = this.findWinningMove(cells, player);
    if (winMove !== -1) {
      return { type: 'win', move: winMove };
    }
    
    // 检查阻挡机会
    const blockMove = this.findWinningMove(cells, opponent);
    if (blockMove !== -1) {
      return { type: 'block', move: blockMove };
    }
    
    return { type: 'strategic' };
  }

  /**
   * 查找获胜移动
   * @param {array} cells - 棋盘状态
   * @param {string} player - 玩家标识
   * @returns {number} 获胜位置，-1表示没有
   */
  findWinningMove(cells, player) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
      [0, 4, 8], [2, 4, 6]             // 对角线
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      const values = [cells[a], cells[b], cells[c]];
      
      // 检查是否有两个相同符号和一个空位
      const playerCount = values.filter(v => v === player).length;
      const emptyCount = values.filter(v => v === null).length;
      
      if (playerCount === 2 && emptyCount === 1) {
        // 找到空位
        if (cells[a] === null) return a;
        if (cells[b] === null) return b;
        if (cells[c] === null) return c;
      }
    }
    
    return -1;
  }
}

module.exports = new TicTacToeHandler();
