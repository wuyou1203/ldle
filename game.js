const MAX_BLOCKS_PER_TYPE = 20;
const COMBO_WINDOW_MS = 1600;
const OVERDRIVE_DURATION_MS = 12000;
const SAVE_KEY = 'pixelFactorySaveV3';
const MAX_EVENTS = 6;
let visibleUpgradeSignature = '';

function createInitialState() {
    return {
        money: 0,
        totalMoneyEarned: 0,
        prestigePixels: 0,
        clickValue: 1,
        manualClicks: 0,
        combo: 0,
        maxCombo: 0,
        comboExpiresAt: 0,
        energy: 0,
        overdriveUntil: 0,
        totalBuildingsPurchased: 0,
        currentGoalIndex: 0,
        achievementsUnlocked: [],
        eventLog: ['工厂离线完毕，等待新的生产指令。'],
        buildings: [
            { id: 'worker', name: '初级工人', desc: '基础产能，适合快速铺量。', cost: 15, baseGps: 1, count: 0, costMultiplier: 1.15 },
            { id: 'conveyor', name: '传送带', desc: '保持出货节奏，提升稳定流水。', cost: 100, baseGps: 5, count: 0, costMultiplier: 1.15 },
            { id: 'robot', name: '机械手臂', desc: '减少人工瓶颈，放大中期效率。', cost: 1100, baseGps: 20, count: 0, costMultiplier: 1.15 },
            { id: 'manager', name: '工厂经理', desc: '统筹调度，让整线保持高速运转。', cost: 12000, baseGps: 100, count: 0, costMultiplier: 1.15 }
        ],
        upgrades: [
            { id: 'sharp_pixel', name: '锐利像素', cost: 100, desc: '点击收益翻倍。', type: 'click', mult: 2, bought: false },
            { id: 'assembly_gloves', name: '装配手套', cost: 350, desc: '基础点击收益 +3。', type: 'clickFlat', value: 3, bought: false },
            { id: 'turbo_worker', name: '涡轮工人', cost: 500, desc: '初级工人产量翻倍。', type: 'building', target: 'worker', mult: 2, bought: false },
            { id: 'steel_conveyor', name: '精钢传送带', cost: 2000, desc: '传送带产量翻倍。', type: 'building', target: 'conveyor', mult: 2, bought: false },
            { id: 'robot_overclock', name: '机械超频', cost: 8000, desc: '机械手臂产量翻倍。', type: 'building', target: 'robot', mult: 2, bought: false, unlockEarned: 3000 },
            { id: 'manager_ai', name: '调度 AI', cost: 30000, desc: '工厂经理产量翻倍。', type: 'building', target: 'manager', mult: 2, bought: false, unlockEarned: 18000 },
            { id: 'battery_stack', name: '电池矩阵', cost: 12000, desc: '超频能量获取提升 50%。', type: 'energy', mult: 1.5, bought: false, unlockEarned: 6000 }
        ]
    };
}

let state = createInitialState();

const GOALS = [
    {
        title: '点亮产线',
        desc: '累计赚到 100 金币，证明这家厂能顺利开张。',
        rewardText: '奖励 50 金币',
        getProgress: currentState => ({ value: Math.floor(currentState.totalMoneyEarned), target: 100 }),
        complete: currentState => {
            currentState.money += 50;
        }
    },
    {
        title: '招满第一班组',
        desc: '拥有 5 名初级工人，建立基本人力盘。',
        rewardText: '奖励 点击基础 +1',
        getProgress: currentState => ({ value: getBuildingCount('worker'), target: 5 }),
        complete: currentState => {
            currentState.clickValue += 1;
        }
    },
    {
        title: '稳定出货',
        desc: '让每秒收益达到 25，说明工厂已进入自动化阶段。',
        rewardText: '奖励 250 金币',
        getProgress: () => ({ value: Math.floor(calculateGps()), target: 25 }),
        complete: currentState => {
            currentState.money += 250;
        }
    },
    {
        title: '连击管理',
        desc: '打出 8 连击，让手动节奏也能产生爆发。',
        rewardText: '奖励 能量 +35',
        getProgress: currentState => ({ value: currentState.maxCombo, target: 8 }),
        complete: currentState => {
            currentState.energy = Math.min(100, currentState.energy + 35);
        }
    },
    {
        title: '主管上线',
        desc: '拥有 1 位工厂经理，开始进入规模管理。',
        rewardText: '奖励 永久碎片 +1',
        getProgress: () => ({ value: getBuildingCount('manager'), target: 1 }),
        complete: currentState => {
            currentState.prestigePixels += 1;
        }
    }
];

const ACHIEVEMENTS = [
    { id: 'first_click', name: '第一笔订单', icon: '●', condition: currentState => currentState.manualClicks >= 1 },
    { id: 'crew_online', name: '五人工位', icon: '▲', condition: () => getBuildingCount('worker') >= 5 },
    { id: 'combo_master', name: '连击上头', icon: '◆', condition: currentState => currentState.maxCombo >= 10 },
    { id: 'auto_line', name: '自动化启动', icon: '■', condition: () => calculateGps() >= 50 },
    { id: 'first_prestige', name: '量子重塑', icon: '✦', condition: currentState => currentState.prestigePixels >= 1 }
];

// DOM 元素
const moneyEl = document.getElementById('money');
const gpsEl = document.getElementById('gps');
const clickPowerEl = document.getElementById('click-power');
const dayCountEl = document.getElementById('day-count');
const comboDisplayEl = document.getElementById('combo-display');
const lifetimeMoneyEl = document.getElementById('lifetime-money');
const overdriveFillEl = document.getElementById('overdrive-fill');
const overdriveBtn = document.getElementById('overdrive-btn');
const factoryEl = document.getElementById('factory-core');
const shopEl = document.getElementById('shop-items');
const upgradeShopEl = document.getElementById('upgrade-items');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const prestigeBtn = document.getElementById('prestige-btn');
const saveStatusEl = document.getElementById('save-status');
const goalTitleEl = document.getElementById('goal-title');
const goalDescEl = document.getElementById('goal-desc');
const goalProgressEl = document.getElementById('goal-progress-text');
const goalRewardEl = document.getElementById('goal-reward');
const goalProgressFillEl = document.getElementById('goal-progress-fill');
const achievementListEl = document.getElementById('achievement-list');
const achievementCountEl = document.getElementById('achievement-count');
const eventLogEl = document.getElementById('event-log');
const totalBuildingsEl = document.getElementById('total-buildings');

// 标签切换
function showTab(tabName) {
    document.getElementById('buildings-list').style.display = tabName === 'buildings' ? 'block' : 'none';
    document.getElementById('upgrades-list').style.display = tabName === 'upgrades' ? 'block' : 'none';
    document.getElementById('prestige-area').style.display = tabName === 'prestige' ? 'block' : 'none';
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(tabName === 'buildings' ? '建筑' : (tabName === 'upgrades' ? '升级' : '重塑'))) {
            btn.classList.add('active');
        }
    });
}

// 初始化
function init() {
    initShop();
    initUpgrades();
    syncDecorations();
    updateUI();
}

function initShop() {
    shopEl.innerHTML = '';
    state.buildings.forEach((building, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        itemEl.id = `shop-${building.id}`;
        itemEl.innerHTML = `
            <div class="item-info">
                <div class="item-topline">
                    <span class="name">${building.name}</span>
                    <span class="cost">+${building.baseGps}/秒</span>
                </div>
                <span class="item-desc">${building.desc}</span>
                <div class="item-bottomline">
                    <span class="cost">花费 <span id="cost-${building.id}">${formatNumber(building.cost)}</span></span>
                    <span class="cost-note">增长系数 x${building.costMultiplier.toFixed(2)}</span>
                </div>
            </div>
            <div class="item-count" id="count-${building.id}">${building.count}</div>
        `;
        itemEl.onclick = () => buyBuilding(index);
        shopEl.appendChild(itemEl);
    });
}

function initUpgrades() {
    upgradeShopEl.innerHTML = '';
    const visibleUpgrades = state.upgrades.filter(isUpgradeVisible);
    visibleUpgradeSignature = visibleUpgrades.map(upgrade => `${upgrade.id}:${upgrade.bought ? 1 : 0}`).join('|');

    state.upgrades.forEach((upgrade, index) => {
        if (!isUpgradeVisible(upgrade)) return;

        const itemEl = document.createElement('div');
        itemEl.className = `upgrade-item ${upgrade.bought ? 'bought' : ''}`;
        itemEl.id = `upgrade-${upgrade.id}`;
        itemEl.innerHTML = `
            <div class="item-info">
                <span class="name">${upgrade.name}</span>
                <span class="desc">${upgrade.desc}</span>
                <span class="cost">价格: ${upgrade.cost}</span>
            </div>
        `;
        itemEl.onclick = () => buyUpgrade(index);
        upgradeShopEl.appendChild(itemEl);
    });
}

// 逻辑
function buyBuilding(index) {
    const b = state.buildings[index];
    if (state.money >= b.cost) {
        state.money -= b.cost;
        b.count++;
        b.cost *= b.costMultiplier;
        state.totalBuildingsPurchased++;
        state.energy = Math.min(100, state.energy + getEnergyGain(3));

        addDynamicBlock(b.id);
        logEvent(`新增 ${b.name}，当前数量 ${b.count}。`);
        checkGoalProgress();
        checkAchievements();
        updateUI();
    }
}

function addDynamicBlock(type) {
    const decorContainer = document.getElementById('factory-decorations');
    if (!decorContainer) return;

    const count = getBuildingCount(type);
    if (count > MAX_BLOCKS_PER_TYPE) return;

    const block = document.createElement('div');
    block.className = `decor-block decor-${type}`;

    const x = Math.random() * 100 + 20;
    const y = Math.random() * 80 + 20;
    block.style.left = `${x}px`;
    block.style.top = `${y}px`;

    block.style.animationDelay = `${Math.random() * 2}s`;

    decorContainer.appendChild(block);
}

function buyUpgrade(index) {
    const u = state.upgrades[index];
    if (state.money >= u.cost && !u.bought) {
        state.money -= u.cost;
        u.bought = true;
        if (u.type === 'click') state.clickValue *= u.mult;
        if (u.type === 'clickFlat') state.clickValue += u.value;
        logEvent(`研发完成：${u.name}。`);
        initUpgrades();
        checkGoalProgress();
        checkAchievements();
        updateUI();
    }
}

factoryEl.onclick = () => {
    const now = Date.now();
    if (now <= state.comboExpiresAt) {
        state.combo = Math.min(10, state.combo + 1);
    } else {
        state.combo = 1;
    }

    state.comboExpiresAt = now + COMBO_WINDOW_MS;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.manualClicks++;

    const val = calculateClickValue();
    state.money += val;
    state.totalMoneyEarned += val;
    state.energy = Math.min(100, state.energy + getEnergyGain(8));
    createFloatingText(`+${formatNumber(val)}`);

    const tip = document.getElementById('click-tip');
    if (tip) tip.style.display = 'none';

    if (state.combo === 5 || state.combo === 10) {
        logEvent(`连击提升至 x${getComboMultiplier().toFixed(1)}，点击节奏正在加速。`);
    }

    checkGoalProgress();
    checkAchievements();
    updateUI();
};

function calculateGps() {
    let total = 0;
    state.buildings.forEach(b => {
        let bGps = b.count * b.baseGps;
        state.upgrades.filter(u => u.bought && u.target === b.id).forEach(u => bGps *= u.mult);
        total += bGps;
    });
    return total * getPrestigeMultiplier() * getOverdriveMultiplier();
}

function calculateClickValue() {
    return state.clickValue * getPrestigeMultiplier() * getComboMultiplier() * getOverdriveMultiplier();
}

function getPrestigeMultiplier() {
    return 1 + state.prestigePixels * 0.05;
}

function getComboMultiplier() {
    return 1 + Math.max(0, state.combo - 1) * 0.12;
}

function getOverdriveMultiplier() {
    return isOverdriveActive() ? 2 : 1;
}

function isOverdriveActive() {
    return Date.now() < state.overdriveUntil;
}

function getEnergyGain(baseAmount) {
    const batteryUpgrade = state.upgrades.find(upgrade => upgrade.id === 'battery_stack');
    const mult = batteryUpgrade && batteryUpgrade.bought ? batteryUpgrade.mult : 1;
    return baseAmount * mult;
}

function getBuildingCount(id) {
    const building = state.buildings.find(item => item.id === id);
    return building ? building.count : 0;
}

function getTotalBuildings() {
    return state.buildings.reduce((total, building) => total + building.count, 0);
}

function getProductionDay() {
    return Math.max(1, Math.floor(state.totalMoneyEarned / 500) + 1);
}

function formatNumber(value) {
    const numericValue = Number(value);
    if (numericValue >= 1000000) return `${(numericValue / 1000000).toFixed(2)}M`;
    if (numericValue >= 1000) return `${(numericValue / 1000).toFixed(1)}K`;
    return Math.floor(numericValue).toLocaleString();
}

function isUpgradeVisible(upgrade) {
    return !upgrade.unlockEarned || state.totalMoneyEarned >= upgrade.unlockEarned;
}

function checkGoalProgress() {
    const goal = GOALS[state.currentGoalIndex];
    if (!goal) return;

    const progress = goal.getProgress(state);
    if (progress.value >= progress.target) {
        goal.complete(state);
        logEvent(`订单完成：${goal.title}。${goal.rewardText}`);
        state.currentGoalIndex++;
        checkGoalProgress();
    }
}

function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        if (!state.achievementsUnlocked.includes(achievement.id) && achievement.condition(state)) {
            state.achievementsUnlocked.push(achievement.id);
            logEvent(`成就解锁：${achievement.name}`);
        }
    });
}

function renderAchievements() {
    const unlocked = ACHIEVEMENTS.filter(achievement => state.achievementsUnlocked.includes(achievement.id));
    achievementCountEl.innerText = unlocked.length;

    if (!unlocked.length) {
        achievementListEl.innerHTML = '<span class="empty-state">还没有成就，先把工厂跑起来。</span>';
        return;
    }

    achievementListEl.innerHTML = unlocked
        .map(achievement => `<span class="badge">${achievement.icon} ${achievement.name}</span>`)
        .join('');
}

function renderEventLog() {
    eventLogEl.innerHTML = state.eventLog
        .map(entry => `<div class="event-entry">${entry}</div>`)
        .join('');
}

function logEvent(message) {
    state.eventLog = [message, ...state.eventLog].slice(0, MAX_EVENTS);
}

function syncDecorations() {
    const decorContainer = document.getElementById('factory-decorations');
    if (!decorContainer) return;

    decorContainer.innerHTML = '';
    state.buildings.forEach(building => {
        const displayCount = Math.min(building.count, MAX_BLOCKS_PER_TYPE);
        for (let index = 0; index < displayCount; index++) {
            addDynamicBlock(building.id);
        }
    });
}

function triggerOverdrive() {
    if (state.energy < 100 || isOverdriveActive()) return;

    state.energy = 0;
    state.overdriveUntil = Date.now() + OVERDRIVE_DURATION_MS;
    logEvent('超频启动，12 秒内点击与自动收益翻倍。');
    updateUI();
}

function updateUI() {
    const nextUpgradeSignature = state.upgrades
        .filter(isUpgradeVisible)
        .map(upgrade => `${upgrade.id}:${upgrade.bought ? 1 : 0}`)
        .join('|');

    if (nextUpgradeSignature !== visibleUpgradeSignature) {
        initUpgrades();
    }

    moneyEl.innerText = formatNumber(state.money);
    gpsEl.innerText = calculateGps().toFixed(1);
    clickPowerEl.innerText = calculateClickValue().toFixed(1);
    dayCountEl.innerText = getProductionDay();
    comboDisplayEl.innerText = `x${getComboMultiplier().toFixed(1)}`;
    lifetimeMoneyEl.innerText = formatNumber(state.totalMoneyEarned);
    overdriveFillEl.style.width = `${Math.min(100, state.energy)}%`;
    overdriveBtn.disabled = state.energy < 100 || isOverdriveActive();
    overdriveBtn.innerText = isOverdriveActive() ? '超频运行中' : '启动超频';

    state.buildings.forEach(b => {
        const costNode = document.getElementById(`cost-${b.id}`);
        if(costNode) costNode.innerText = formatNumber(b.cost);
        const countNode = document.getElementById(`count-${b.id}`);
        if(countNode) countNode.innerText = b.count;
        const btn = document.getElementById(`shop-${b.id}`);
        if(btn) btn.className = `shop-item ${state.money < b.cost ? 'locked' : ''}`;
    });

    state.upgrades.forEach(upgrade => {
        const upgradeNode = document.getElementById(`upgrade-${upgrade.id}`);
        if (upgradeNode) {
            upgradeNode.className = `upgrade-item ${upgrade.bought ? 'bought' : ''}`;
            upgradeNode.style.opacity = state.money >= upgrade.cost || upgrade.bought ? '1' : '0.55';
        }
    });

    const ready = Math.floor(Math.sqrt(state.totalMoneyEarned / 1000) - state.prestigePixels);
    document.getElementById('pixels-ready').innerText = Math.max(0, ready);
    document.getElementById('pixels-total').innerText = state.prestigePixels;
    document.getElementById('prestige-bonus-display').innerText = `+${(state.prestigePixels * 5)}%`;
    totalBuildingsEl.innerText = getTotalBuildings();

    const goal = GOALS[state.currentGoalIndex];
    if (goal) {
        const progress = goal.getProgress(state);
        const ratio = Math.min(100, (progress.value / progress.target) * 100);
        goalTitleEl.innerText = goal.title;
        goalDescEl.innerText = goal.desc;
        goalProgressEl.innerText = `${Math.min(progress.value, progress.target)} / ${progress.target}`;
        goalRewardEl.innerText = goal.rewardText;
        goalProgressFillEl.style.width = `${ratio}%`;
    } else {
        goalTitleEl.innerText = '订单清空';
        goalDescEl.innerText = '你已完成当前版本全部订单，可以继续冲击更高重塑层数。';
        goalProgressEl.innerText = '完成';
        goalRewardEl.innerText = '奖励已领取';
        goalProgressFillEl.style.width = '100%';
    }

    renderAchievements();
    renderEventLog();
}

prestigeBtn.onclick = () => {
    const ready = Math.floor(Math.sqrt(state.totalMoneyEarned / 1000) - state.prestigePixels);
    if (ready <= 0) return alert('你还需要赚更多钱才能获得像素碎片！');

    if (confirm(`重塑会清空当前现金、建筑和升级，但你会获得 ${ready} 个碎片。确定继续吗？`)) {
        state.prestigePixels += ready;
        state.money = 0;
        state.totalMoneyEarned = 0;
        state.clickValue = 1;
        state.manualClicks = 0;
        state.combo = 0;
        state.maxCombo = 0;
        state.comboExpiresAt = 0;
        state.energy = 0;
        state.overdriveUntil = 0;
        state.totalBuildingsPurchased = 0;
        state.currentGoalIndex = 0;
        state.eventLog = ['完成一次重塑，像素核心重新校准。'];
        state.buildings.forEach(b => {
            b.count = 0;
            b.cost = b.id === 'worker' ? 15 : (b.id === 'conveyor' ? 100 : (b.id === 'robot' ? 1100 : 12000));
        });
        state.upgrades.forEach(u => u.bought = false);
        syncDecorations();
        logEvent(`完成重塑，获得 ${ready} 个像素碎片。`);
        saveGame();
        init();
        showTab('buildings');
    }
};

function createFloatingText(text) {
    const el = document.createElement('div');
    el.innerText = text;
    el.className = 'float-text';
    el.style.left = `${Math.random() * 40 + 30}%`;
    document.getElementById('click-area').appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

setInterval(() => {
    const gps = calculateGps();
    if (gps > 0) {
        state.money += gps / 10;
        state.totalMoneyEarned += gps / 10;
    }
    const previousCombo = state.combo;
    if (state.combo > 0 && Date.now() > state.comboExpiresAt) {
        state.combo = 0;
    }

    if (isOverdriveActive() && Math.random() < 0.06) {
        state.energy = Math.min(100, state.energy + 0.6);
    }

    if (gps > 0 || previousCombo !== state.combo || isOverdriveActive()) {
        checkGoalProgress();
        checkAchievements();
        updateUI();
    }
}, 100);

function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (saveStatusEl) saveStatusEl.innerText = `已存档 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY) || localStorage.getItem('pixelFactorySaveV2');
    if (saved) {
        const parsed = JSON.parse(saved);
        const freshState = createInitialState();
        state = {
            ...freshState,
            ...parsed,
            buildings: freshState.buildings.map(building => ({
                ...building,
                ...(parsed.buildings || []).find(savedBuilding => savedBuilding.id === building.id)
            })),
            upgrades: freshState.upgrades.map(upgrade => ({
                ...upgrade,
                ...(parsed.upgrades || []).find(savedUpgrade => savedUpgrade.id === upgrade.id)
            })),
            achievementsUnlocked: parsed.achievementsUnlocked || [],
            eventLog: parsed.eventLog && parsed.eventLog.length ? parsed.eventLog : freshState.eventLog
        };
    }
}

loadGame();
init();
window.showTab = showTab;

overdriveBtn.onclick = triggerOverdrive;
saveBtn.onclick = () => {
    saveGame();
    logEvent('手动存档完成。');
    updateUI();
};
resetBtn.onclick = () => {
    if (!confirm('确定重置全部进度吗？该操作不可撤销。')) return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('pixelFactorySaveV2');
    state = createInitialState();
    syncDecorations();
    init();
};

setInterval(saveGame, 15000);
checkGoalProgress();
checkAchievements();
updateUI();

// --- 开发人员后门 (开发者工具控制台使用) ---
// 在浏览器控制台输入 cheat() 即可获得 10亿金币
window.cheat = function(amount = 1000000000) {
    state.money += amount;
    state.totalMoneyEarned += amount;
    logEvent(`调试模式注入 ${formatNumber(amount)} 金币。`);
    updateUI();
    console.log(`%c [后门激活] 已注入 ${amount.toLocaleString()} 金币！`, "color: #ffcc00; font-weight: bold; font-size: 14px;");
};

// 隐藏快捷键：按住 Ctrl + Shift + C 触发
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        window.cheat();
        createFloatingText("💰 CHEATER! 💰");
    }
});
