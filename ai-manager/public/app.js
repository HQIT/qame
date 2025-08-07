// API基础URL
const API_BASE = '/api';

// 当前数据
let currentClients = [];
let currentLLMConfigs = [];
let currentStats = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    
    // 定期刷新数据
    setInterval(loadStats, 5000); // 每5秒刷新统计
    setInterval(refreshClients, 10000); // 每10秒刷新客户端列表
});

// ========== 数据加载 ==========

async function loadInitialData() {
    await loadStats();
    await refreshClients();
    await refreshLLMConfigs();
    loadLLMConfigOptions();
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const result = await response.json();
        
        if (result.code === 200) {
            currentStats = result.data;
            updateStatsDisplay();
        }
    } catch (error) {
        console.error('加载统计信息失败:', error);
    }
}

function updateStatsDisplay() {
    document.getElementById('totalClients').textContent = currentStats.totalClients || 0;
    document.getElementById('runningClients').textContent = currentStats.statusCounts?.running || 0;
    document.getElementById('llmConfigs').textContent = currentStats.llmConfigCount || 0;
    document.getElementById('aiTypes').textContent = currentStats.aiTypeCount || 0;
}

// ========== AI客户端管理 ==========

async function refreshClients() {
    try {
        const response = await fetch(`${API_BASE}/clients`);
        const result = await response.json();
        
        if (result.code === 200) {
            currentClients = result.data;
            renderClientsList();
        } else {
            showError('加载AI客户端列表失败: ' + result.message);
        }
    } catch (error) {
        showError('加载AI客户端列表失败: ' + error.message);
    }
}

function renderClientsList() {
    const container = document.getElementById('clients-list');
    
    if (currentClients.length === 0) {
        container.innerHTML = '<div class="loading">暂无AI客户端</div>';
        return;
    }
    
    const html = currentClients.map(client => `
        <div class="client-card">
            <div class="client-header">
                <div>
                    <strong>${client.playerName || client.id}</strong>
                    <span class="client-status status-${client.status}">${getStatusText(client.status)}</span>
                </div>
                <div>
                    <button class="btn" onclick="showClientDetails('${client.id}')">详情</button>
                    <button class="btn btn-danger" onclick="stopClient('${client.id}')">停止</button>
                </div>
            </div>
            <div>
                <div><strong>游戏:</strong> ${client.gameType || '未指定'}</div>
                <div><strong>AI类型:</strong> ${client.aiType || '未指定'}</div>
                <div><strong>创建时间:</strong> ${formatTime(client.createdAt)}</div>
                <div><strong>日志条数:</strong> ${client.logCount || 0}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function getStatusText(status) {
    const statusMap = {
        'running': '运行中',
        'stopped': '已停止',
        'crashed': '已崩溃',
        'starting': '启动中',
        'stopping': '停止中'
    };
    return statusMap[status] || status;
}

function formatTime(timeStr) {
    return new Date(timeStr).toLocaleString('zh-CN');
}

async function stopClient(clientId) {
    if (!confirm('确定要停止这个AI客户端吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.code === 200) {
            showSuccess('AI客户端已停止');
            refreshClients();
            loadStats();
        } else {
            showError('停止失败: ' + result.message);
        }
    } catch (error) {
        showError('停止失败: ' + error.message);
    }
}

async function stopAllClients() {
    if (!confirm('确定要停止所有AI客户端吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/clients`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.code === 200) {
            showSuccess('所有AI客户端已停止');
            refreshClients();
            loadStats();
        } else {
            showError('停止失败: ' + result.message);
        }
    } catch (error) {
        showError('停止失败: ' + error.message);
    }
}

function showCreateClientModal() {
    document.getElementById('createClientModal').style.display = 'block';
}

async function createClient() {
    const config = {
        playerName: document.getElementById('clientPlayerName').value,
        matchId: document.getElementById('clientMatchId').value,
        gameType: document.getElementById('clientGameType').value,
        aiType: document.getElementById('clientAIType').value,
        llmConfig: document.getElementById('clientLLMConfig').value
    };
    
    if (!config.playerName) {
        showError('请输入玩家名称');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const result = await response.json();
        
        if (result.code === 200) {
            showSuccess('AI客户端创建成功');
            closeModal('createClientModal');
            refreshClients();
            loadStats();
            
            // 清空表单
            document.getElementById('clientPlayerName').value = '';
            document.getElementById('clientMatchId').value = '';
        } else {
            showError('创建失败: ' + result.message);
        }
    } catch (error) {
        showError('创建失败: ' + error.message);
    }
}

// ========== LLM配置管理 ==========

async function refreshLLMConfigs() {
    try {
        const response = await fetch(`${API_BASE}/llm-configs`);
        const result = await response.json();
        
        if (result.code === 200) {
            currentLLMConfigs = result.data;
            renderLLMConfigsList();
        } else {
            showError('加载LLM配置失败: ' + result.message);
        }
    } catch (error) {
        showError('加载LLM配置失败: ' + error.message);
    }
}

function renderLLMConfigsList() {
    const container = document.getElementById('llm-configs-list');
    
    const html = currentLLMConfigs.map(config => `
        <div class="config-item">
            <div>
                <strong>${config.name}</strong><br>
                <small>${config.endpoint}</small><br>
                <small>模型: ${config.model || 'N/A'}</small>
            </div>
            <div>
                <button class="btn" onclick="editLLMConfig('${config.id}')">编辑</button>
                ${config.id !== 'default' ? `<button class="btn btn-danger" onclick="deleteLLMConfig('${config.id}')">删除</button>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function loadLLMConfigOptions() {
    const selects = ['clientLLMConfig', 'batchLLMConfig'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = currentLLMConfigs.map(config => 
            `<option value="${config.id}">${config.name}</option>`
        ).join('');
    });
}

function showCreateLLMModal() {
    document.getElementById('createLLMModal').style.display = 'block';
}

async function createLLMConfig() {
    const config = {
        name: document.getElementById('llmName').value,
        endpoint: document.getElementById('llmEndpoint').value,
        apiKey: document.getElementById('llmApiKey').value,
        model: document.getElementById('llmModel').value,
        maxTokens: parseInt(document.getElementById('llmMaxTokens').value),
        temperature: parseFloat(document.getElementById('llmTemperature').value),
        systemPrompt: document.getElementById('llmSystemPrompt').value
    };
    
    if (!config.name || !config.endpoint) {
        showError('请填写配置名称和API端点');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/llm-configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const result = await response.json();
        
        if (result.code === 200) {
            showSuccess('LLM配置添加成功');
            closeModal('createLLMModal');
            refreshLLMConfigs();
            loadStats();
            
            // 清空表单
            document.getElementById('llmName').value = '';
            document.getElementById('llmEndpoint').value = '';
            document.getElementById('llmApiKey').value = '';
            document.getElementById('llmModel').value = '';
            document.getElementById('llmSystemPrompt').value = '';
        } else {
            showError('添加失败: ' + result.message);
        }
    } catch (error) {
        showError('添加失败: ' + error.message);
    }
}

async function deleteLLMConfig(configId) {
    if (!confirm('确定要删除这个LLM配置吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/llm-configs/${configId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.code === 200) {
            showSuccess('LLM配置已删除');
            refreshLLMConfigs();
            loadStats();
        } else {
            showError('删除失败: ' + result.message);
        }
    } catch (error) {
        showError('删除失败: ' + error.message);
    }
}

// ========== 批量操作 ==========

async function createBatchClients() {
    const count = parseInt(document.getElementById('batchCount').value);
    const gameType = document.getElementById('batchGameType').value;
    const aiType = document.getElementById('batchAIType').value;
    const llmConfig = document.getElementById('batchLLMConfig').value;
    
    if (count < 1 || count > 10) {
        showError('创建数量必须在1-10之间');
        return;
    }
    
    const configs = [];
    for (let i = 1; i <= count; i++) {
        configs.push({
            playerName: `AI-${gameType}-${i}`,
            gameType,
            aiType,
            llmConfig
        });
    }
    
    try {
        const response = await fetch(`${API_BASE}/clients/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configs })
        });
        const result = await response.json();
        
        if (result.code === 200) {
            const results = result.data;
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            let message = `批量创建完成: 成功 ${successCount} 个`;
            if (failCount > 0) {
                message += `, 失败 ${failCount} 个`;
            }
            
            showSuccess(message);
            
            // 显示详细结果
            const resultsHtml = results.map((result, index) => 
                `<div class="${result.success ? 'success' : 'error'}">
                    AI-${index + 1}: ${result.success ? '创建成功' : result.error}
                </div>`
            ).join('');
            
            document.getElementById('batch-results').innerHTML = resultsHtml;
            
            refreshClients();
            loadStats();
        } else {
            showError('批量创建失败: ' + result.message);
        }
    } catch (error) {
        showError('批量创建失败: ' + error.message);
    }
}

// ========== 工具函数 ==========

function showTab(tabName) {
    // 隐藏所有面板
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 移除所有标签的active类
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示目标面板
    document.getElementById(tabName + '-panel').classList.add('active');
    
    // 激活目标标签
    event.target.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showError(message) {
    // 简单的错误提示实现
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.maxWidth = '300px';
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 5000);
}

function showSuccess(message) {
    // 简单的成功提示实现
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '9999';
    successDiv.style.maxWidth = '300px';
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        document.body.removeChild(successDiv);
    }, 3000);
}

// 模态框点击外部关闭
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}
