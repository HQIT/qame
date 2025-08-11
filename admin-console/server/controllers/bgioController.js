const bgioController = {
  // 获取boardgame.io的所有游戏匹配
  async getMatches(req, res) {
    try {
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      
      // 先获取游戏列表
      const gamesResponse = await fetch(`${gameServerUrl}/games`);
      const games = await gamesResponse.json();
      
      let allMatches = [];
      
      // 遍历每个游戏，获取其匹配列表
      for (const gameName of games) {
        try {
          const matchesResponse = await fetch(`${gameServerUrl}/games/${gameName}`);
          const gameData = await matchesResponse.json();
          
          if (gameData.matches) {
            // 为每个匹配添加游戏名称
            const matchesWithGame = gameData.matches.map(match => ({
              ...match,
              gameName: gameName
            }));
            allMatches = allMatches.concat(matchesWithGame);
          }
        } catch (error) {
          console.warn(`获取游戏 ${gameName} 的匹配失败:`, error);
        }
      }

      res.json({
        code: 200,
        message: '获取boardgame.io匹配列表成功',
        data: {
          matches: allMatches,
          total: allMatches.length,
          games: games
        }
      });
    } catch (error) {
      console.error('获取boardgame.io匹配失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取boardgame.io匹配失败',
        data: null
      });
    }
  },

  // 获取单个boardgame.io匹配详情
  async getMatch(req, res) {
    try {
      const { id } = req.params; // 这里的id应该是 gameName/matchID 格式
      const [gameName, matchID] = id.split('/');
      
      if (!gameName || !matchID) {
        return res.status(400).json({
          code: 400,
          message: '匹配ID格式错误，应为: gameName/matchID',
          data: null
        });
      }

      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      const response = await fetch(`${gameServerUrl}/games/${gameName}/${matchID}`);
      
      if (!response.ok) {
        return res.status(404).json({
          code: 404,
          message: 'boardgame.io匹配不存在',
          data: null
        });
      }

      const match = await response.json();

      res.json({
        code: 200,
        message: '获取boardgame.io匹配详情成功',
        data: {
          match: match,
          gameName: gameName,
          matchID: matchID
        }
      });
    } catch (error) {
      console.error('获取boardgame.io匹配详情失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取boardgame.io匹配详情失败',
        data: null
      });
    }
  },

  // 删除boardgame.io匹配（通过让所有玩家离开来触发自动删除）
  async deleteMatch(req, res) {
    try {
      const { id } = req.params;
      const [gameName, matchID] = id.split('/');
      
      if (!gameName || !matchID) {
        return res.status(400).json({
          code: 400,
          message: '匹配ID格式错误，应为: gameName/matchID',
          data: null
        });
      }

      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      
      // 先获取匹配详情，查看有哪些玩家
      const matchResponse = await fetch(`${gameServerUrl}/games/${gameName}/${matchID}`);
      if (!matchResponse.ok) {
        return res.status(404).json({
          code: 404,
          message: 'boardgame.io匹配不存在',
          data: null
        });
      }

      const matchData = await matchResponse.json();
      const players = matchData.players || [];
      
      let leaveResults = [];
      
      // 让所有玩家离开匹配
      for (let i = 0; i < players.length; i++) {
        if (players[i]) { // 如果玩家位置不为空
          try {
            const leaveResponse = await fetch(`${gameServerUrl}/games/${gameName}/${matchID}/leave`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                playerID: i.toString(),
                credentials: players[i].credentials || 'admin-force-leave'
              })
            });
            
            leaveResults.push({
              playerID: i,
              playerName: players[i].name,
              success: leaveResponse.ok,
              status: leaveResponse.status
            });
          } catch (error) {
            leaveResults.push({
              playerID: i,
              playerName: players[i].name,
              success: false,
              error: error.message
            });
          }
        }
      }

      // 检查匹配是否已被自动删除
      const verifyResponse = await fetch(`${gameServerUrl}/games/${gameName}/${matchID}`);
      const isDeleted = !verifyResponse.ok;

      res.json({
        code: 200,
        message: isDeleted ? 
          'boardgame.io匹配已成功删除（所有玩家已离开）' : 
          'boardgame.io匹配玩家离开操作完成，但匹配可能仍存在',
        data: {
          matchDeleted: isDeleted,
          leaveResults: leaveResults,
          totalPlayers: players.length
        }
      });
    } catch (error) {
      console.error('删除boardgame.io匹配失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除boardgame.io匹配失败',
        data: null
      });
    }
  },

  // 获取游戏状态列表（从boardgame.io匹配中获取）
  async getGameStates(req, res) {
    try {
      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      
      // 获取游戏列表
      const gamesResponse = await fetch(`${gameServerUrl}/games`);
      const games = await gamesResponse.json();
      
      let gameStates = [];
      
      // 遍历每个游戏，获取其匹配状态
      for (const gameName of games) {
        try {
          const matchesResponse = await fetch(`${gameServerUrl}/games/${gameName}`);
          const gameData = await matchesResponse.json();
          
          if (gameData.matches) {
            gameData.matches.forEach(match => {
              gameStates.push({
                matchID: match.matchID,
                gameName: gameName,
                players: match.players,
                createdAt: match.createdAt,
                updatedAt: match.updatedAt,
                setupData: match.setupData
              });
            });
          }
        } catch (error) {
          console.warn(`获取游戏 ${gameName} 状态失败:`, error);
        }
      }

      res.json({
        code: 200,
        message: '获取boardgame.io游戏状态成功',
        data: gameStates
      });
    } catch (error) {
      console.error('获取boardgame.io游戏状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取boardgame.io游戏状态失败',
        data: null
      });
    }
  },

  // 获取单个游戏状态
  async getGameState(req, res) {
    try {
      const { matchId } = req.params; // 格式：gameName/matchID
      const [gameName, matchID] = matchId.split('/');
      
      if (!gameName || !matchID) {
        return res.status(400).json({
          code: 400,
          message: '匹配ID格式错误，应为: gameName/matchID',
          data: null
        });
      }

      const gameServerUrl = process.env.GAME_SERVER_URL || 'http://game-server:8000';
      const response = await fetch(`${gameServerUrl}/games/${gameName}/${matchID}`);
      
      if (!response.ok) {
        return res.status(404).json({
          code: 404,
          message: 'boardgame.io游戏状态不存在',
          data: null
        });
      }

      const gameState = await response.json();

      res.json({
        code: 200,
        message: '获取boardgame.io游戏状态成功',
        data: gameState
      });
    } catch (error) {
      console.error('获取boardgame.io游戏状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取boardgame.io游戏状态失败',
        data: null
      });
    }
  },

  // 删除游戏状态（与删除匹配相同）
  async deleteGameState(req, res) {
    try {
      const { matchId } = req.params;
      
      // 调用删除匹配的逻辑
      req.params.id = matchId;
      return await this.deleteMatch(req, res);
    } catch (error) {
      console.error('删除boardgame.io游戏状态失败:', error);
      res.status(500).json({
        code: 500,
        message: '删除boardgame.io游戏状态失败',
        data: null
      });
    }
  }

};

module.exports = bgioController;
