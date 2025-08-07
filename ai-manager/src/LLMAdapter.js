/**
 * LLM适配器 - 简化设计，支持第三方LLM提供商接入
 * 第三方只需要实现一个简单的HTTP接口即可
 */

const fetch = require('node-fetch');

class LLMAdapter {
  constructor(config) {
    this.config = config;
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 100;
    this.temperature = config.temperature || 0.7;
    this.timeout = config.timeout || 10000;
    this.systemPrompt = config.systemPrompt || '你是一个聪明的游戏AI助手。请分析游戏状态并选择最佳移动。';
    this.gamePrompts = config.gamePrompts || {};
  }

  /**
   * 调用第三方LLM提供商
   * @param {Object} gameAnalysis - 游戏分析结果
   * @returns {Promise<number>} 移动位置
   */
  async getMove(gameAnalysis) {
    try {
      console.log('🤖 [LLM Adapter] 调用第三方LLM:', this.endpoint);
      
      // 构建游戏特定的提示词
      const gamePrompt = this.gamePrompts[gameAnalysis.gameType] || '';
      const fullPrompt = `${this.systemPrompt}\n\n${gamePrompt}\n\n当前游戏状态: ${JSON.stringify(gameAnalysis, null, 2)}`;
      
      const requestBody = {
        model: this.model,
        prompt: fullPrompt,
        gameAnalysis,
        gameType: gameAnalysis.gameType,
        currentPlayer: gameAnalysis.currentPlayer,
        availableMoves: gameAnalysis.availableMoves,
        maxTokens: this.maxTokens,
        temperature: this.temperature,
        timestamp: Date.now()
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 如果有API Key，添加到请求头
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`LLM调用失败: ${response.status}`);
      }

      const data = await response.json();
      
      // 验证响应格式
      if (!this.validateResponse(data)) {
        throw new Error('LLM响应格式无效');
      }

      return data.move;
    } catch (error) {
      console.error('❌ [LLM Adapter] LLM调用失败:', error);
      return null;
    }
  }

  /**
   * 验证LLM响应格式
   * @param {Object} response - LLM响应
   * @returns {boolean} 是否有效
   */
  validateResponse(response) {
    // 最简单的验证：必须有move字段且为数字
    return response && typeof response.move === 'number' && response.move >= 0;
  }

  /**
   * 健康检查
   * @returns {Promise<boolean>} 是否健康
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = { LLMAdapter };
