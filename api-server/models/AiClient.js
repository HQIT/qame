const { query } = require('../config/database');

class AiClient {
  static async assignToMatch(clientId, matchId, seatIndex) {
    if (!clientId || !matchId) {
      return null;
    }
    const result = await query(
      `UPDATE ai_clients 
       SET match_id = $2, player_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [clientId, matchId, String(seatIndex)]
    );
    return result.rows[0] || null;
  }

  static async clearAssignmentByClientId(clientId) {
    if (!clientId) {
      return null;
    }
    const result = await query(
      `UPDATE ai_clients 
       SET match_id = NULL, player_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [clientId]
    );
    return result.rows[0] || null;
  }
}

module.exports = AiClient;


