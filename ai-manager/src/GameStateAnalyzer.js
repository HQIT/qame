class GameStateAnalyzer {
  constructor(gameType = 'tic-tac-toe') {
    this.gameType = gameType;
  }

  analyze(gameState, playerID) {
    if (!gameState || !gameState.G || !gameState.ctx) {
      console.warn('⚠️ [GameStateAnalyzer] 游戏状态无效');
      return null;
    }

    const { G, ctx } = gameState;
    
    // 通用分析，适用于所有游戏类型
    const analysis = {
      gameType: this.gameType,
      gameState: G,
      context: ctx,
      currentPlayer: ctx.currentPlayer,
      turn: ctx.turn || 1,
      gameover: ctx.gameover || false,
      opponent: this.getOpponent(ctx.currentPlayer),
      playerID: playerID
    };

    // 根据游戏类型添加特定分析
    const specificAnalysis = this.getGameSpecificAnalysis(G, ctx, playerID);
    return { ...analysis, ...specificAnalysis };
  }

  /**
   * 获取游戏特定的分析
   * @param {Object} G - 游戏状态
   * @param {Object} ctx - 游戏上下文
   * @param {string} playerID - 玩家ID
   * @returns {Object} 游戏特定分析
   */
  getGameSpecificAnalysis(G, ctx, playerID) {
    // 根据游戏类型动态分析
    switch (this.gameType) {
      case 'tic-tac-toe':
        return this.analyzeTicTacToe(G, ctx, playerID);
      case 'connect-four':
        return this.analyzeConnectFour(G, ctx, playerID);
      case 'checkers':
        return this.analyzeCheckers(G, ctx, playerID);
      default:
        return this.analyzeGeneric(G, ctx, playerID);
    }
  }

  // 井字棋分析
  analyzeTicTacToe(G, ctx, playerID) {
    const board = G.cells || Array(9).fill(null);
    
    return {
      board: board,
      availableMoves: this.getAvailableMoves(board),
      winningMoves: this.getWinningMoves(board, playerID),
      blockingMoves: this.getBlockingMoves(board, playerID),
      gamePhase: this.getGamePhase(board),
      strategicPositions: this.getStrategicPositions(board)
    };
  }

  // 四子棋分析
  analyzeConnectFour(G, ctx, playerID) {
    const board = G.board || Array(6).fill().map(() => Array(7).fill(null));
    
    return {
      board: board,
      availableMoves: this.getConnectFourAvailableMoves(board),
      winningMoves: this.getConnectFourWinningMoves(board, playerID),
      blockingMoves: this.getConnectFourBlockingMoves(board, playerID),
      gamePhase: this.getConnectFourGamePhase(board)
    };
  }

  // 跳棋分析
  analyzeCheckers(G, ctx, playerID) {
    const board = G.board || Array(8).fill().map(() => Array(8).fill(null));
    
    return {
      board: board,
      availableMoves: this.getCheckersAvailableMoves(board, playerID),
      gamePhase: this.getCheckersGamePhase(board)
    };
  }

  // 通用分析 - 适用于未知游戏类型
  analyzeGeneric(G, ctx, playerID) {
    return {
      availableMoves: this.getGenericAvailableMoves(G, ctx),
      gamePhase: this.getGenericGamePhase(G, ctx)
    };
  }

  // 通用方法
  getOpponent(playerID) {
    return playerID === '0' ? '1' : '0';
  }

  // 井字棋相关方法
  getAvailableMoves(board) {
    return board
      .map((cell, index) => cell === null ? index : -1)
      .filter(i => i !== -1);
  }

  getWinningMoves(board, playerID) {
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        const tempBoard = [...board];
        tempBoard[i] = playerID;
        if (this.checkWin(tempBoard, playerID)) {
          moves.push(i);
        }
      }
    }
    return moves;
  }

  getBlockingMoves(board, playerID) {
    const opponent = this.getOpponent(playerID);
    return this.getWinningMoves(board, opponent);
  }

  getGamePhase(board) {
    const filledCells = board.filter(cell => cell !== null).length;
    
    if (filledCells <= 2) {
      return 'opening';
    } else if (filledCells <= 6) {
      return 'midgame';
    } else {
      return 'endgame';
    }
  }

  getStrategicPositions(board) {
    const strategic = {
      center: board[4] === null ? 4 : null,
      corners: [0, 2, 6, 8].filter(pos => board[pos] === null),
      edges: [1, 3, 5, 7].filter(pos => board[pos] === null)
    };
    
    return strategic;
  }

  checkWin(board, playerID) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // 行
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // 列
      [0, 4, 8], [2, 4, 6] // 对角线
    ];

    return lines.some(line => 
      line.every(index => board[index] === playerID)
    );
  }

  // 四子棋相关方法
  getConnectFourAvailableMoves(board) {
    const moves = [];
    for (let col = 0; col < 7; col++) {
      if (board[0][col] === null) {
        moves.push(col);
      }
    }
    return moves;
  }

  getConnectFourWinningMoves(board, playerID) {
    // 实现四子棋获胜移动检测
    return [];
  }

  getConnectFourBlockingMoves(board, playerID) {
    // 实现四子棋阻止移动检测
    return [];
  }

  getConnectFourGamePhase(board) {
    const totalPieces = board.flat().filter(cell => cell !== null).length;
    
    if (totalPieces <= 6) {
      return 'opening';
    } else if (totalPieces <= 30) {
      return 'midgame';
    } else {
      return 'endgame';
    }
  }

  // 跳棋相关方法
  getCheckersAvailableMoves(board, playerID) {
    // 实现跳棋可用移动检测
    return [];
  }

  getCheckersGamePhase(board) {
    const totalPieces = board.flat().filter(cell => cell !== null).length;
    
    if (totalPieces >= 20) {
      return 'opening';
    } else if (totalPieces >= 8) {
      return 'midgame';
    } else {
      return 'endgame';
    }
  }

  // 通用方法 - 适用于未知游戏类型
  getGenericAvailableMoves(G, ctx) {
    // 尝试从游戏状态中推断可用移动
    if (G.moves) {
      return G.moves;
    }
    
    // 如果游戏有标准的移动格式
    if (G.availableMoves) {
      return G.availableMoves;
    }
    
    // 默认返回空数组
    return [];
  }

  getGenericGamePhase(G, ctx) {
    // 根据回合数推断游戏阶段
    const turn = ctx.turn || 1;
    
    if (turn <= 3) {
      return 'opening';
    } else if (turn <= 10) {
      return 'midgame';
    } else {
      return 'endgame';
    }
  }

  // 评估棋盘状态
  evaluateBoard(board, playerID) {
    const opponent = this.getOpponent(playerID);
    
    // 检查是否获胜
    if (this.checkWin(board, playerID)) {
      return 1000;
    }
    
    // 检查是否失败
    if (this.checkWin(board, opponent)) {
      return -1000;
    }
    
    // 评估位置价值
    let score = 0;
    const positionValues = [3, 2, 3, 2, 4, 2, 3, 2, 3]; // 中心位置价值最高
    
    for (let i = 0; i < 9; i++) {
      if (board[i] === playerID) {
        score += positionValues[i];
      } else if (board[i] === opponent) {
        score -= positionValues[i];
      }
    }
    
    return score;
  }

  // 获取最佳移动（传统算法）
  getBestMove(board, playerID) {
    const availableMoves = this.getAvailableMoves(board);
    
    if (availableMoves.length === 0) {
      return null;
    }
    
    // 1. 检查获胜移动
    const winningMoves = this.getWinningMoves(board, playerID);
    if (winningMoves.length > 0) {
      return winningMoves[0];
    }
    
    // 2. 检查阻止对手获胜的移动
    const blockingMoves = this.getBlockingMoves(board, playerID);
    if (blockingMoves.length > 0) {
      return blockingMoves[0];
    }
    
    // 3. 选择中心位置
    if (availableMoves.includes(4)) {
      return 4;
    }
    
    // 4. 选择角落位置
    const corners = [0, 2, 6, 8];
    for (const corner of corners) {
      if (availableMoves.includes(corner)) {
        return corner;
      }
    }
    
    // 5. 选择边缘位置
    const edges = [1, 3, 5, 7];
    for (const edge of edges) {
      if (availableMoves.includes(edge)) {
        return edge;
      }
    }
    
    // 6. 选择任何可用位置
    return availableMoves[0];
  }

  // 检查是否平局
  isDraw(board) {
    return board.every(cell => cell !== null);
  }

  // 获取游戏状态摘要
  getGameSummary(board, playerID) {
    const opponent = this.getOpponent(playerID);
    const playerWins = this.checkWin(board, playerID);
    const opponentWins = this.checkWin(board, opponent);
    const isDraw = this.isDraw(board);
    
    if (playerWins) {
      return 'win';
    } else if (opponentWins) {
      return 'lose';
    } else if (isDraw) {
      return 'draw';
    } else {
      return 'ongoing';
    }
  }
}

module.exports = { GameStateAnalyzer };
