// 游戏状态
let state = {
    money: 0,
    totalMoneyEarned: 0,
    prestigePixels: 0, // 重塑获得的碎片
    clickValue: 1,
    buildings: [
        { id: 'worker', name: '初级工人', cost: 15, baseGps: 1, count: 0, costMultiplier: 1.15 },
        { id: 'conveyor', name: '传送带', cost: 100, baseGps: 5, count: 0, costMultiplier: 1.15 },
        { id: 'robot', name: '机械手臂', cost: 1100, baseGps: 20, count: 0, costMultiplier: 1.15 },
        { id: 'manager', name: '工厂经理', cost: 12000, baseGps: 100, count: 0, costMultiplier: 1.15 }
    ],
    upgrades: [
        { id: 'sharp_pixel', name: '锐利像素', cost: 100, desc: '点击收益翻倍', type: 'click', mult: 2, bought: false },
        { id: 'turbo_worker', name: '涡轮工人', cost: 500, desc: '初级工人产量翻倍', type: 'building', target: 'worker', mult: 2, bought: false },
        { id: 'steel_conveyor', name: '精钢传送带', cost: 2000, desc: '传送带产量翻倍', type: 'building', target: 'conveyor', mult: 2, bought: false }
    ]
};

// DOM 元素
const moneyEl = document.getElementById('money');
const gpsEl = document.getElementById('gps');
const factoryEl = document.getElementById('factory-core');
const shopEl = document.getElementById('shop-items');
const upgradeShopEl = document.getElementById('upgrade-items');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const prestigeBtn = document.getElementById('prestige-btn');

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
                <span class="name">${building.name}</span>
                <span class="cost">🪙 <span id="cost-${building.id}">${Math.floor(building.cost)}</span></span>
            </div>
            <div class="item-count" id="count-${building.id}">${building.count}</div>
        `;
        itemEl.onclick = () => buyBuilding(index);
        shopEl.appendChild(itemEl);
    });
}

function initUpgrades() {
    upgradeShopEl.innerHTML = '';
    state.upgrades.forEach((upgrade, index) => {
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
        
        // 增加动态方块装饰
        addDynamicBlock(b.id);
        
        updateUI();
    }
}

// 动态方块管理
const MAX_BLOCKS_PER_TYPE = 20; // 每个建筑类型最多显示的方块数
function addDynamicBlock(type) {
    const decorContainer = document.getElementById('factory-decorations');
    if (!decorContainer) return;

    const count = state.buildings.find(b => b.id === type).count;
    if (count > MAX_BLOCKS_PER_TYPE) return; // 达到视觉上限

    const block = document.createElement('div');
    block.className = `decor-block decor-${type}`;
    
    // 随机位置（在工厂范围内）
    const x = Math.random() * 100 + 20;
    const y = Math.random() * 80 + 20;
    block.style.left = `${x}px`;
    block.style.top = `${y}px`;
    
    // 给方块一点随机偏移的动画延迟，看起来更自然
    block.style.animationDelay = `${Math.random() * 2}s`;
    
    decorContainer.appendChild(block);
}

function buyUpgrade(index) {
    const u = state.upgrades[index];
    if (state.money >= u.cost && !u.bought) {
        state.money -= u.cost;
        u.bought = true;
        if (u.type === 'click') state.clickValue *= u.mult;
        initUpgrades();
        updateUI();
    }
}

factoryEl.onclick = () => {
    const val = state.clickValue * (1 + state.prestigePixels * 0.05);
    state.money += val;
    state.totalMoneyEarned += val;
    createFloatingText(`+${Math.floor(val)}`);
    
    // 隐藏提示
    const tip = document.getElementById('click-tip');
    if (tip) tip.style.display = 'none';
    
    updateUI();
};

function calculateGps() {
    let total = 0;
    state.buildings.forEach(b => {
        let bGps = b.count * b.baseGps;
        state.upgrades.filter(u => u.bought && u.target === b.id).forEach(u => bGps *= u.mult);
        total += bGps;
    });
    return total * (1 + state.prestigePixels * 0.05);
}

function updateUI() {
    moneyEl.innerText = Math.floor(state.money).toLocaleString();
    gpsEl.innerText = calculateGps().toFixed(1);
    
    // 移除旧的整体图标逻辑，因为我们现在改用增量添加方块了
    // 同时也为了确保加载存档时能显示出已有的方块
    const decorContainer = document.getElementById('factory-decorations');
    if (decorContainer && decorContainer.children.length === 0) {
        state.buildings.forEach(b => {
            const displayCount = Math.min(b.count, MAX_BLOCKS_PER_TYPE);
            for(let i=0; i<displayCount; i++) {
                addDynamicBlock(b.id);
            }
        });
    }

    state.buildings.forEach(b => {
        const costNode = document.getElementById(`cost-${b.id}`);
        if(costNode) costNode.innerText = Math.floor(b.cost).toLocaleString();
        const countNode = document.getElementById(`count-${b.id}`);
        if(countNode) countNode.innerText = b.count;
        const btn = document.getElementById(`shop-${b.id}`);
        if(btn) btn.className = `shop-item ${state.money < b.cost ? 'locked' : ''}`;
    });

    const ready = Math.floor(Math.sqrt(state.totalMoneyEarned / 1000) - state.prestigePixels);
    document.getElementById('pixels-ready').innerText = Math.max(0, ready);
    document.getElementById('pixels-total').innerText = state.prestigePixels;
    document.getElementById('prestige-bonus-display').innerText = `加成: +${(state.prestigePixels * 5)}%`;
}

prestigeBtn.onclick = () => {
    const ready = Math.floor(Math.sqrt(state.totalMoneyEarned / 1000) - state.prestigePixels);
    if (ready <= 0) return alert('你还需要赚更多钱才能获得像素碎片！');
    
    if (confirm(`重绘像素将清发所有钱、建筑和升级，但你会获得 ${ready} 个碎片。确定吗？`)) {
        state.prestigePixels += ready;
        state.money = 0;
        state.totalMoneyEarned = 0;
        state.clickValue = 1;
        state.buildings.forEach(b => {
            b.count = 0;
            b.cost = b.id === 'worker' ? 15 : (b.id === 'conveyor' ? 100 : (b.id === 'robot' ? 1100 : 12000));
        });
        state.upgrades.forEach(u => u.bought = false);
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
        updateUI();
    }
}, 100);

function saveGame() { localStorage.setItem('pixelFactorySaveV2', JSON.stringify(state)); }
function loadGame() {
    const saved = localStorage.getItem('pixelFactorySaveV2');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
    }
}

const style = document.createElement('style');
style.innerHTML = `
.float-text { position: absolute; top: 40%; color: #ffeb3b; font-weight: bold; animation: floatUp 1s forwards; pointer-events: none; }
@keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-120px); opacity: 0; } }
.desc { display: block; font-size: 0.8rem; color: #eee; margin: 4px 0; }
`;
document.head.appendChild(style);

loadGame();
init();
window.showTab = showTab;

// --- 开发人员后门 (开发者工具控制台使用) ---
// 在浏览器控制台输入 cheat() 即可获得 10亿金币
window.cheat = function(amount = 1000000000) {
    state.money += amount;
    state.totalMoneyEarned += amount;
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
