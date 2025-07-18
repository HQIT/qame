/**
 * 井字棋游戏提示词模板
 * 用于生成发送给LLM的提示词
 */

/**
 * 生成游戏状态的可视化表示
 * @param {Array} cells - 棋盘状态数组
 * @param {string} currentPlayer - 当前玩家ID
 * @returns {string} 格式化的棋盘字符串
 */
function formatBoard(cells, currentPlayer) {
  const symbols = {
    '0': 'X',
    '1': 'O',
    null: ' '
  };
  
  const board = [
    ` ${symbols[cells[0]]} | ${symbols[cells[1]]} | ${symbols[cells[2]]} `,
    '---+---+---',
    ` ${symbols[cells[3]]} | ${symbols[cells[4]]} | ${symbols[cells[5]]} `,
    '---+---+---',
    ` ${symbols[cells[6]]} | ${symbols[cells[7]]} | ${symbols[cells[8]]} `
  ].join('\n');
  
  return board;
}

/**
 * 生成位置索引说明
 * @returns {string} 位置索引说明
 */
function getPositionGuide() {
  return `
位置索引说明：
0 | 1 | 2
---+---+---
3 | 4 | 5
---+---+---
6 | 7 | 8

你可以选择0-8中的任意一个数字作为你的移动位置。`;
}

/**
 * 生成游戏策略指导
 * @returns {string} 策略指导文本
 */
function getStrategyGuide() {
  return `
游戏策略指导：
1. 优先选择能够立即获胜的位置
2. 阻止对手在下一步获胜
3. 优先选择中心位置(4)，因为它能创造最多的获胜机会
4. 选择角落位置(0,2,6,8)，因为它们能形成对角线获胜
5. 最后选择边缘位置(1,3,5,7)
6. 如果以上策略都不适用，选择任意可用位置`;
}

/**
 * 生成完整的游戏提示词
 * @param {Array} cells - 当前棋盘状态
 * @param {string} playerID - AI玩家的ID
 * @param {string} currentPlayer - 当前轮到哪个玩家
 * @returns {string} 完整的提示词
 */
export function generateGamePrompt(cells, playerID, currentPlayer) {
  const playerSymbol = playerID === '0' ? 'X' : 'O';
  const opponentSymbol = playerID === '0' ? 'O' : 'X';
  
  const board = formatBoard(cells, currentPlayer);
  const positionGuide = getPositionGuide();
  const strategyGuide = getStrategyGuide();
  
  return `你正在玩井字棋游戏。你是玩家${playerSymbol}，对手是玩家${opponentSymbol}。

当前棋盘状态：
${board}

你的符号：${playerSymbol}
对手符号：${opponentSymbol}
当前轮到：${currentPlayer === playerID ? '你' : '对手'}

${strategyGuide}

${positionGuide}

请分析当前局势，选择最佳移动位置。只返回一个数字(0-8)，不要包含任何其他文字或解释。

你的选择：`;
}

/**
 * 生成简化的游戏提示词（用于快速决策）
 * @param {Array} cells - 当前棋盘状态
 * @param {string} playerID - AI玩家的ID
 * @returns {string} 简化的提示词
 */
export function generateSimplePrompt(cells, playerID) {
  const board = formatBoard(cells, playerID);
  
  return `井字棋游戏。你是${playerID === '0' ? 'X' : 'O'}。

棋盘：
${board}

选择位置(0-8)：`;
} 