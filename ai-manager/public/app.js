// API基础URL
const API_BASE = '/api';

// 当前数据
let currentClients = [];
let currentPlayers = [];
let currentStats = {};
let availableGames = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    
    // 定期刷新数据
    setInterval(loadStats, 10000); // 每10秒刷新统计
    setInterval(refreshClients, 15000); // 每15秒刷新客户端列表
    setInterval(refreshPlayers, 15000); // 每15秒刷新玩家列表
});

// ========== 初始化数据加载 ==========

async function loadInitialData() {
    await loadAvailableGames();
    await loadStats();
    await refreshClients();
    await refreshPlayers();
}

async function loadAvailableGames() {
    try {
        // 从API Server获取游戏列表（包含元信息和实际可玩状态）
        const response = await fetch('/api/games');
        const result = await response.json();
        
        if (result.code === 200) {
            // 提取游戏ID列表
            availableGames = result.data.map(game => game.id) || [];
        } else {
            availableGames = [];
        }
    } catch (error) {
        console.error('加载游戏列表失败:', error);
        availableGames = [];
    }
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
    document.getElementById('totalClients').textContent = currentStats.clients?.total || 0;
    document.getElementById('totalPlayers').textContent = currentStats.players?.total || 0;
    document.getElementById('activePlayers').textContent = currentStats.players?.active || 0;
    
    // 计算支持的游戏数量
    const supportedGames = new Set();
    if (currentStats.clients?.by_games) {
        Object.keys(currentStats.clients.by_games).forEach(game => {
            supportedGames.add(game);
        });
    }
    document.getElementById('supportedGames').textContent = supportedGames.size;
}

// ========== 标签页管理 ==========

function showTab(tabName) {
    // 隐藏所有标签页
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // 显示选中的标签页
    event.target.classList.add('active');
    document.getElementById(`${tabName}-panel`).classList.add('active');
    
    // 刷新对应数据
    if (tabName === 'clients') {
        refreshClients();
    } else if (tabName === 'players') {
        refreshPlayers();
    }
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
            showError('clients-list', '加载AI客户端失败: ' + result.message);
        }
    } catch (error) {
        console.error('获取AI客户端列表失败:', error);
        showError('clients-list', '网络错误');
    }
}

function renderClientsList() {
    const container = document.getElementById('clients-list');
    
    if (currentClients.length === 0) {
        container.innerHTML = '<div class="loading">暂无AI客户端</div>';
        return;
    }
    
    const html = currentClients.map(client => `
        <div class="list-item">
            <h3>${escapeHtml(client.name)}</h3>
            <div class="list-item-details">
                <div class="detail-item">
                    <span class="detail-label">客户端ID:</span> ${client.id}
                </div>
                <div class="detail-item">
                    <span class="detail-label">接口地址:</span> ${escapeHtml(client.endpoint)}
                </div>
                <div class="detail-item">
                    <span class="detail-label">支持游戏:</span> ${client.supported_games.join(', ')}
                </div>
                <div class="detail-item">
                    <span class="detail-label">创建时间:</span> ${formatDateTime(client.created_at)}
                </div>
            </div>
            ${client.description ? `<div style="margin-bottom: 10px; color: #666;"><strong>描述:</strong> ${escapeHtml(client.description)}</div>` : ''}
            <div class="list-item-actions">
                <button class="btn btn-small" onclick="editClient('${client.id}')">编辑</button>
                <button class="btn btn-small btn-danger" onclick="deleteClient('${client.id}')">删除</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function showCreateClientModal() {
    renderGamesCheckboxes('clientSupportedGames');
    document.getElementById('createClientModal').style.display = 'block';
}

async function createClient() {
    const name = document.getElementById('clientName').value.trim();
    const endpoint = document.getElementById('clientEndpoint').value.trim();
    const description = document.getElementById('clientDescription').value.trim();
    const supported_games = getSelectedGames('clientSupportedGames');
    
    if (!name || !endpoint) {
        alert('请填写客户端名称和接口地址');
        return;
    }
    
    if (supported_games.length === 0) {
        alert('请至少选择一个支持的游戏');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                endpoint,
                supported_games,
                description
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            closeModal('createClientModal');
            refreshClients();
            loadStats();
            clearClientForm();
            showSuccess('clients-list', 'AI客户端创建成功');
        } else {
            alert('创建失败: ' + result.message);
        }
    } catch (error) {
        console.error('创建AI客户端失败:', error);
        alert('网络错误');
    }
}

function editClient(clientId) {
    const client = currentClients.find(c => c.id === clientId);
    if (!client) return;
    
    document.getElementById('editClientId').value = client.id;
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientEndpoint').value = client.endpoint;
    document.getElementById('editClientDescription').value = client.description || '';
    
    renderGamesCheckboxes('editClientSupportedGames', client.supported_games);
    document.getElementById('editClientModal').style.display = 'block';
}

async function updateClient() {
    const clientId = document.getElementById('editClientId').value;
    const name = document.getElementById('editClientName').value.trim();
    const endpoint = document.getElementById('editClientEndpoint').value.trim();
    const description = document.getElementById('editClientDescription').value.trim();
    const supported_games = getSelectedGames('editClientSupportedGames');
    
    if (!name || !endpoint) {
        alert('请填写客户端名称和接口地址');
        return;
    }
    
    if (supported_games.length === 0) {
        alert('请至少选择一个支持的游戏');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                endpoint,
                supported_games,
                description
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            closeModal('editClientModal');
            refreshClients();
            loadStats();
            showSuccess('clients-list', 'AI客户端更新成功');
        } else {
            alert('更新失败: ' + result.message);
        }
    } catch (error) {
        console.error('更新AI客户端失败:', error);
        alert('网络错误');
    }
}

async function deleteClient(clientId) {
    if (!confirm('确定要删除这个AI客户端吗？这将删除所有相关的AI玩家。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/clients/${clientId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            refreshClients();
            refreshPlayers(); // 刷新玩家列表，因为可能有相关玩家被删除
            loadStats();
            showSuccess('clients-list', 'AI客户端删除成功');
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        console.error('删除AI客户端失败:', error);
        alert('网络错误');
    }
}

function clearClientForm() {
    document.getElementById('clientName').value = '';
    document.getElementById('clientEndpoint').value = '';
    document.getElementById('clientDescription').value = '';
    // 取消所有游戏选择
    document.querySelectorAll('#clientSupportedGames input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// ========== AI玩家管理 ==========

async function refreshPlayers() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        const result = await response.json();
        
        if (result.code === 200) {
            currentPlayers = result.data;
            renderPlayersList();
        } else {
            showError('players-list', '加载AI玩家失败: ' + result.message);
        }
    } catch (error) {
        console.error('获取AI玩家列表失败:', error);
        showError('players-list', '网络错误');
    }
}

function renderPlayersList() {
    const container = document.getElementById('players-list');
    
    if (currentPlayers.length === 0) {
        container.innerHTML = '<div class="loading">暂无AI玩家</div>';
        return;
    }
    
    const html = currentPlayers.map(player => `
        <div class="list-item">
            <h3>${escapeHtml(player.player_name)} ${player.status === 'active' ? '🟢' : '🔴'}</h3>
            <div class="list-item-details">
                <div class="detail-item">
                    <span class="detail-label">玩家ID:</span> ${player.id}
                </div>
                <div class="detail-item">
                    <span class="detail-label">AI客户端:</span> ${escapeHtml(player.client_name || '未知')}
                </div>
                <div class="detail-item">
                    <span class="detail-label">状态:</span> ${player.status === 'active' ? '活跃' : '停用'}
                </div>
                <div class="detail-item">
                    <span class="detail-label">创建时间:</span> ${formatDateTime(player.created_at)}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-small" onclick="togglePlayerStatus(${player.id})">${player.status === 'active' ? '停用' : '启用'}</button>
                <button class="btn btn-small btn-danger" onclick="deletePlayer(${player.id})">删除</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

async function showCreatePlayerModal() {
    await loadClientOptions();
    document.getElementById('createPlayerModal').style.display = 'block';
}

async function loadClientOptions() {
    const select = document.getElementById('playerAIClient');
    select.innerHTML = '<option value="">请选择AI客户端</option>';
    
    currentClients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} (${client.supported_games.join(', ')})`;
        select.appendChild(option);
    });
}

async function createPlayer() {
    const player_name = document.getElementById('playerName').value.trim();
    const ai_client_id = document.getElementById('playerAIClient').value;
    const status = document.getElementById('playerStatus').value;
    
    if (!player_name || !ai_client_id) {
        alert('请填写玩家名称并选择AI客户端');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                player_name,
                ai_client_id,
                status
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            closeModal('createPlayerModal');
            refreshPlayers();
            loadStats();
            clearPlayerForm();
            showSuccess('players-list', 'AI玩家创建成功');
        } else {
            alert('创建失败: ' + result.message);
        }
    } catch (error) {
        console.error('创建AI玩家失败:', error);
        alert('网络错误');
    }
}

async function togglePlayerStatus(playerId) {
    const player = currentPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    const newStatus = player.status === 'active' ? 'inactive' : 'active';
    
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            refreshPlayers();
            loadStats();
        } else {
            alert('状态更新失败: ' + result.message);
        }
    } catch (error) {
        console.error('更新玩家状态失败:', error);
        alert('网络错误');
    }
}

async function deletePlayer(playerId) {
    if (!confirm('确定要删除这个AI玩家吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            refreshPlayers();
            loadStats();
            showSuccess('players-list', 'AI玩家删除成功');
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        console.error('删除AI玩家失败:', error);
        alert('网络错误');
    }
}

function clearPlayerForm() {
    document.getElementById('playerName').value = '';
    document.getElementById('playerAIClient').value = '';
    document.getElementById('playerStatus').value = 'active';
}

// ========== 游戏选择相关 ==========

function renderGamesCheckboxes(containerId, selectedGames = []) {
    const container = document.getElementById(containerId);
    
    if (availableGames.length === 0) {
        container.innerHTML = '<div class="loading">无可用游戏</div>';
        return;
    }
    
    const html = availableGames.map(game => `
        <label class="game-checkbox">
            <input type="checkbox" value="${game}" ${selectedGames.includes(game) ? 'checked' : ''}>
            ${game}
        </label>
    `).join('');
    
    container.innerHTML = html;
}

function getSelectedGames(containerId) {
    const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// ========== 模态框管理 ==========

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ========== 工具函数 ==========

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(dateString) {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function showError(containerId, message) {
    document.getElementById(containerId).innerHTML = `<div class="error">${message}</div>`;
}

function showSuccess(containerId, message) {
    const container = document.getElementById(containerId);
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    container.insertBefore(successDiv, container.firstChild);
    
    // 3秒后自动移除成功消息
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}