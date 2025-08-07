const { query } = require('../config/database');

class Game {
  constructor(data) {
    Object.assign(this, data);
  }

  // 根据ID和状态获取游戏
  static async findByIdAndStatus(id, status) {
    const result = await query('SELECT * FROM games WHERE id = $1 AND status = $2', [id, status]);
    return result.rows.length > 0 ? new Game(result.rows[0]) : null;
  }

  // 获取所有活跃游戏
  static async findActive() {
    const result = await query('SELECT * FROM games WHERE status = $1 ORDER BY name', ['active']);
    return result.rows.map(row => new Game(row));
  }
}

module.exports = Game;
