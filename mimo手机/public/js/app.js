const API_BASE = '';

// ==================== 状态管理 ====================

const state = {
  isPoweredOn: false,
  isBooting: false,
  isLocked: true,
  currentApp: null,
  apps: [],
  notes: [],
  settings: {},
  battery: 80,
  history: []
};

// ==================== DOM 元素 ====================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  screenOff: $('#screenOff'),
  bootScreen: $('#bootScreen'),
  lockScreen: $('#lockScreen'),
  homeScreen: $('#homeScreen'),
  appContainer: $('#appContainer'),
  appGrid: $('#appGrid'),
  dockBar: $('#dockBar'),
  appBody: $('#appBody'),
  appTitle: $('#appTitle'),
  powerBtn: $('#powerBtn'),
  homeBtn: $('#homeBtn')
};

// ==================== 时间更新 ====================

function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${h}:${m}`;

  ['lockTime', 'homeTime', 'appTime'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.textContent = timeStr;
  });

  const lockTimeDisplay = $('#lockTimeDisplay');
  if (lockTimeDisplay) lockTimeDisplay.textContent = timeStr;

  const lockDateDisplay = $('#lockDateDisplay');
  if (lockDateDisplay) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    lockDateDisplay.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
  }
}

function updateBattery() {
  const level = state.battery;
  ['lockBattery', 'homeBattery', 'appBattery'].forEach(id => {
    const el = $(`#${id}`);
    if (el) {
      el.style.width = `${level}%`;
      el.style.background = level > 20 ? '#4ade80' : '#ef4444';
    }
  });
  ['lockBatteryText', 'homeBatteryText'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.textContent = `${level}%`;
  });
}

setInterval(updateTime, 1000);
updateTime();

// ==================== 开关机逻辑 ====================

function powerOn() {
  if (state.isPoweredOn) return;
  state.isPoweredOn = true;
  state.isBooting = true;

  els.screenOff.classList.add('hidden');
  els.bootScreen.classList.remove('hidden');

  setTimeout(() => {
    els.bootScreen.classList.add('hidden');
    els.lockScreen.classList.remove('hidden');
    state.isBooting = false;
    updateBattery();
  }, 2800);
}

function powerOff() {
  if (!state.isPoweredOn) return;

  els.lockScreen.classList.add('hidden');
  els.homeScreen.classList.add('hidden');
  els.appContainer.classList.add('hidden');

  els.screenOff.classList.remove('hidden');
  state.isPoweredOn = false;
  state.isLocked = true;
  state.currentApp = null;
}

els.powerBtn.addEventListener('click', () => {
  if (state.isPoweredOn) {
    powerOff();
  } else {
    powerOn();
  }
});

// ==================== 锁屏解锁 ====================

els.lockScreen.addEventListener('click', (e) => {
  if (!state.isPoweredOn || state.isBooting) return;
  unlockPhone();
});

function unlockPhone() {
  state.isLocked = false;
  els.lockScreen.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
  renderHomeScreen();
}

// ==================== 主屏幕 ====================

async function loadApps() {
  try {
    const res = await fetch(`${API_BASE}/api/apps`);
    const data = await res.json();
    if (data.success) {
      state.apps = data.data;
    }
  } catch (err) {
    console.error('加载应用失败:', err);
  }
}

function renderHomeScreen() {
  const installedApps = state.apps.filter(a => a.installed);
  const mainApps = installedApps.filter(a => a.system);
  const otherApps = installedApps.filter(a => !a.system);

  els.appGrid.innerHTML = '';
  otherApps.forEach(app => {
    els.appGrid.appendChild(createAppIcon(app));
  });

  els.dockBar.innerHTML = '';
  mainApps.forEach(app => {
    els.dockBar.appendChild(createAppIcon(app, true));
  });
}

function createAppIcon(app, isDock = false) {
  const div = document.createElement('div');
  div.className = 'app-item';
  div.onclick = () => openApp(app.id);
  div.innerHTML = `
    <div class="app-icon ${app.id}">${app.icon}</div>
    <span class="app-name">${app.name}</span>
  `;
  return div;
}

function openApp(appId) {
  state.currentApp = appId;
  state.history.push(appId);

  els.homeScreen.classList.add('hidden');
  els.appContainer.classList.remove('hidden');

  const app = state.apps.find(a => a.id === appId);
  els.appTitle.textContent = app ? app.name : appId;

  switch (appId) {
    case 'notes': renderNotesApp(); break;
    case 'appstore': renderAppStore(); break;
    case 'browser': renderBrowser(); break;
    case 'calculator': renderCalculator(); break;
    case 'weather': renderWeather(); break;
    case 'clock': renderClock(); break;
    case 'calendar': renderCalendar(); break;
    case 'gallery': renderGallery(); break;
    case 'music': renderMusic(); break;
    case 'settings': renderSettings(); break;
    case 'contacts': renderContacts(); break;
    case 'camera': renderCamera(); break;
    default:
      els.appBody.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚧</div>
          <div class="empty-text">应用开发中...</div>
        </div>
      `;
  }
}

function goHome() {
  if (state.currentApp === 'clock') {
    clearInterval(clockInterval);
  }

  els.appContainer.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
  state.currentApp = null;
  state.history = [];
  renderHomeScreen();
}

// ==================== 备忘录 ====================

async function loadNotes() {
  try {
    const res = await fetch(`${API_BASE}/api/notes`);
    const data = await res.json();
    if (data.success) {
      state.notes = data.data;
    }
  } catch (err) {
    console.error('加载备忘录失败:', err);
  }
}

function renderNotesApp() {
  els.appBody.innerHTML = `
    <div class="notes-app" style="position:relative;min-height:100%;">
      <div class="notes-list" id="notesList"></div>
      <button class="note-add-btn" onclick="showNoteEditor()">+</button>
    </div>
  `;
  renderNotesList();
}

function renderNotesList() {
  const container = $('#notesList');
  if (!container) return;

  if (state.notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">还没有备忘录<br>点击右下角 + 添加</div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.notes.map(note => `
    <div class="note-card" onclick="showNoteEditor(${note.id})">
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-preview">${escapeHtml(note.content)}</div>
      <div class="note-time">${formatDate(note.updatedAt)}</div>
    </div>
  `).join('');
}

function showNoteEditor(noteId = null) {
  const note = noteId ? state.notes.find(n => n.id === noteId) : null;
  const isNew = !note;

  els.appBody.innerHTML = `
    <div class="note-editor">
      <input class="note-editor-title" id="noteTitle" placeholder="标题" value="${note ? escapeHtml(note.title) : ''}">
      <textarea class="note-editor-content" id="noteContent" placeholder="开始输入...">${note ? escapeHtml(note.content) : ''}</textarea>
      <div class="note-editor-actions">
        ${!isNew ? `<button class="btn-delete-note" onclick="deleteNote(${note.id})">删除</button>` : '<div></div>'}
        <button class="btn-save-note" onclick="saveNote(${noteId || 'null'})">保存</button>
      </div>
    </div>
  `;

  if (isNew) {
    setTimeout(() => $('#noteTitle').focus(), 100);
  }
}

async function saveNote(noteId) {
  const title = $('#noteTitle').value.trim();
  const content = $('#noteContent').value.trim();

  if (!title && !content) {
    showToast('请输入内容');
    return;
  }

  try {
    let res;
    if (noteId) {
      res = await fetch(`${API_BASE}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '未命名', content })
      });
    } else {
      res = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '未命名', content })
      });
    }
    const data = await res.json();
    if (data.success) {
      await loadNotes();
      showToast(noteId ? '已更新' : '已保存');
      renderNotesApp();
    }
  } catch (err) {
    showToast('保存失败');
  }
}

async function deleteNote(noteId) {
  if (!confirm('确定删除这条备忘录？')) return;

  try {
    const res = await fetch(`${API_BASE}/api/notes/${noteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await loadNotes();
      showToast('已删除');
      renderNotesApp();
    }
  } catch (err) {
    showToast('删除失败');
  }
}

// ==================== 应用商城 ====================

async function loadAppStore() {
  try {
    const res = await fetch(`${API_BASE}/api/apps`);
    const data = await res.json();
    if (data.success) {
      state.apps = data.data;
    }
  } catch (err) {
    console.error('加载应用商城失败:', err);
  }
}

function renderAppStore() {
  const installed = state.apps.filter(a => a.installed && !a.system);
  const available = state.apps.filter(a => !a.installed);

  els.appBody.innerHTML = `
    <div class="appstore-app">
      <div class="store-search">
        <span class="store-search-icon">🔍</span>
        <input type="text" placeholder="搜索应用..." id="storeSearch" oninput="filterApps()">
      </div>
      ${available.length > 0 ? `
        <div class="store-section">
          <div class="store-section-title">🔥 推荐应用</div>
          <div class="store-app-list" id="availableApps">
            ${available.map(app => renderStoreAppCard(app)).join('')}
          </div>
        </div>
      ` : ''}
      ${installed.length > 0 ? `
        <div class="store-section">
          <div class="store-section-title">✅ 已安装应用</div>
          <div class="store-app-list" id="installedApps">
            ${installed.map(app => renderStoreAppCard(app)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderStoreAppCard(app) {
  const isSystem = app.system;
  const isInstalled = app.installed;

  let btnHtml;
  if (isSystem) {
    btnHtml = `<button class="store-app-btn btn-installed" disabled>系统</button>`;
  } else if (isInstalled) {
    btnHtml = `<button class="store-app-btn btn-uninstall" onclick="uninstallApp('${app.id}')">卸载</button>`;
  } else {
    btnHtml = `<button class="store-app-btn btn-install" onclick="installApp('${app.id}')">安装</button>`;
  }

  return `
    <div class="store-app-card" data-name="${app.name}">
      <div class="store-app-icon app-icon ${app.id}">${app.icon}</div>
      <div class="store-app-info">
        <div class="store-app-name">${app.name}</div>
        <div class="store-app-desc">${app.description}</div>
        <span class="store-app-category">${app.category}</span>
      </div>
      ${btnHtml}
    </div>
  `;
}

async function installApp(appId) {
  try {
    const res = await fetch(`${API_BASE}/api/apps/${appId}/install`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      await loadAppStore();
      showToast('安装成功');
      renderAppStore();
    }
  } catch (err) {
    showToast('安装失败');
  }
}

async function uninstallApp(appId) {
  if (!confirm('确定卸载此应用？')) return;
  try {
    const res = await fetch(`${API_BASE}/api/apps/${appId}/uninstall`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      await loadAppStore();
      showToast('已卸载');
      renderAppStore();
    } else {
      showToast(data.message || '卸载失败');
    }
  } catch (err) {
    showToast('卸载失败');
  }
}

function filterApps() {
  const keyword = ($('#storeSearch')?.value || '').toLowerCase();
  $$('.store-app-card').forEach(card => {
    const name = (card.dataset.name || '').toLowerCase();
    card.style.display = name.includes(keyword) ? '' : 'none';
  });
}

// ==================== 网页浏览器 ====================

function renderBrowser() {
  els.appBody.innerHTML = `
    <div class="browser-app">
      <div class="browser-toolbar">
        <div class="browser-url-bar">
          <span class="browser-url-icon">🔒</span>
          <input class="browser-url-input" id="urlInput" placeholder="输入网址..." onkeydown="if(event.key==='Enter')navigateUrl()">
        </div>
        <button class="browser-go-btn" onclick="navigateUrl()">→</button>
      </div>
      <div class="browser-content" id="browserContent">
        <div class="browser-home">
          <div class="browser-home-logo">🌐</div>
          <div class="browser-home-title">MIMO 浏览器</div>
          <div class="browser-home-subtitle">输入网址开始浏览</div>
          <div class="browser-shortcuts">
            <div class="browser-shortcut" onclick="quickNav('https://www.baidu.com')">
              <div class="shortcut-icon">🔍</div>
              <span class="shortcut-name">百度</span>
            </div>
            <div class="browser-shortcut" onclick="quickNav('https://www.bilibili.com')">
              <div class="shortcut-icon">📺</div>
              <span class="shortcut-name">哔哩哔哩</span>
            </div>
            <div class="browser-shortcut" onclick="quickNav('https://www.zhihu.com')">
              <div class="shortcut-icon">💡</div>
              <span class="shortcut-name">知乎</span>
            </div>
            <div class="browser-shortcut" onclick="quickNav('https://github.com')">
              <div class="shortcut-icon">🐙</div>
              <span class="shortcut-name">GitHub</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function navigateUrl() {
  let url = ($('#urlInput')?.value || '').trim();
  if (!url) return;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  $('#urlInput').value = url;
  const browserContent = $('#browserContent');
  browserContent.innerHTML = `
    <div class="browser-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>
    <iframe src="${url}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" style="width:100%;height:calc(100% - 36px);border:none;"></iframe>
  `;
}

function quickNav(url) {
  $('#urlInput').value = url;
  navigateUrl();
}

// ==================== 计算器 ====================

let calcDisplay = '0';
let calcExpression = '';
let calcPrevValue = null;
let calcOperator = null;
let calcWaitingForOperand = false;

function renderCalculator() {
  calcDisplay = '0';
  calcExpression = '';
  calcPrevValue = null;
  calcOperator = null;
  calcWaitingForOperand = false;

  els.appBody.innerHTML = `
    <div class="calculator-app">
      <div class="calc-display">
        <div class="calc-expression" id="calcExpression"></div>
        <div class="calc-result" id="calcResult">0</div>
      </div>
      <div class="calc-buttons">
        <button class="calc-btn calc-btn-function" onclick="calcClear()">AC</button>
        <button class="calc-btn calc-btn-function" onclick="calcToggleSign()">±</button>
        <button class="calc-btn calc-btn-function" onclick="calcPercent()">%</button>
        <button class="calc-btn calc-btn-operator" onclick="calcOp('/')">÷</button>

        <button class="calc-btn calc-btn-number" onclick="calcDigit('7')">7</button>
        <button class="calc-btn calc-btn-number" onclick="calcDigit('8')">8</button>
        <button class="calc-btn calc-btn-number" onclick="calcDigit('9')">9</button>
        <button class="calc-btn calc-btn-operator" onclick="calcOp('*')">×</button>

        <button class="calc-btn calc-btn-number" onclick="calcDigit('4')">4</button>
        <button class="calc-btn calc-btn-number" onclick="calcDigit('5')">5</button>
        <button class="calc-btn calc-btn-number" onclick="calcDigit('6')">6</button>
        <button class="calc-btn calc-btn-operator" onclick="calcOp('-')">−</button>

        <button class="calc-btn calc-btn-number" onclick="calcDigit('1')">1</button>
        <button class="calc-btn calc-btn-number" onclick="calcDigit('2')">2</button>
        <button class="calc-btn calc-btn-number" onclick="calcDigit('3')">3</button>
        <button class="calc-btn calc-btn-operator" onclick="calcOp('+')">+</button>

        <button class="calc-btn calc-btn-number" onclick="calcDigit('0')" style="grid-column:span 2">0</button>
        <button class="calc-btn calc-btn-number" onclick="calcDot()">.</button>
        <button class="calc-btn calc-btn-equals" onclick="calcEquals()">=</button>
      </div>
    </div>
  `;
}

function calcUpdateDisplay() {
  const resultEl = $('#calcResult');
  const exprEl = $('#calcExpression');
  if (resultEl) resultEl.textContent = calcDisplay;
  if (exprEl) exprEl.textContent = calcExpression;
}

function calcDigit(d) {
  if (calcWaitingForOperand) {
    calcDisplay = d;
    calcWaitingForOperand = false;
  } else {
    calcDisplay = calcDisplay === '0' ? d : calcDisplay + d;
  }
  calcUpdateDisplay();
}

function calcDot() {
  if (calcWaitingForOperand) {
    calcDisplay = '0.';
    calcWaitingForOperand = false;
  } else if (!calcDisplay.includes('.')) {
    calcDisplay += '.';
  }
  calcUpdateDisplay();
}

function calcClear() {
  calcDisplay = '0';
  calcExpression = '';
  calcPrevValue = null;
  calcOperator = null;
  calcWaitingForOperand = false;
  calcUpdateDisplay();
}

function calcToggleSign() {
  calcDisplay = String(-parseFloat(calcDisplay));
  calcUpdateDisplay();
}

function calcPercent() {
  calcDisplay = String(parseFloat(calcDisplay) / 100);
  calcUpdateDisplay();
}

function calcOp(op) {
  const inputValue = parseFloat(calcDisplay);
  const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  if (calcPrevValue !== null && calcOperator && !calcWaitingForOperand) {
    const result = performCalc(calcPrevValue, inputValue, calcOperator);
    calcDisplay = String(result);
    calcPrevValue = result;
  } else {
    calcPrevValue = inputValue;
  }

  calcWaitingForOperand = true;
  calcOperator = op;
  calcExpression = `${calcPrevValue} ${opSymbols[op]}`;
  calcUpdateDisplay();
}

function calcEquals() {
  if (calcPrevValue === null || !calcOperator) return;

  const inputValue = parseFloat(calcDisplay);
  const result = performCalc(calcPrevValue, inputValue, calcOperator);
  const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  calcExpression = `${calcPrevValue} ${opSymbols[calcOperator]} ${inputValue} =`;
  calcDisplay = String(result);
  calcPrevValue = null;
  calcOperator = null;
  calcWaitingForOperand = true;
  calcUpdateDisplay();
}

function performCalc(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 'Error';
    default: return b;
  }
}

// ==================== 天气 ====================

function renderWeather() {
  const conditions = [
    { icon: '☀️', desc: '晴', temp: 28 },
    { icon: '⛅', desc: '多云', temp: 24 },
    { icon: '🌧️', desc: '小雨', temp: 18 },
    { icon: '🌤️', desc: '晴转多云', temp: 26 }
  ];
  const current = conditions[Math.floor(Math.random() * conditions.length)];
  const forecasts = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  els.appBody.innerHTML = `
    <div class="weather-app">
      <div class="weather-main">
        <div class="weather-location">📍 上海市</div>
        <div class="weather-icon">${current.icon}</div>
        <div class="weather-temp">${current.temp}°</div>
        <div class="weather-desc">${current.desc}</div>
      </div>
      <div class="weather-details">
        <div class="weather-detail-item">
          <div class="weather-detail-label">湿度</div>
          <div class="weather-detail-value">${55 + Math.floor(Math.random() * 30)}%</div>
        </div>
        <div class="weather-detail-item">
          <div class="weather-detail-label">风速</div>
          <div class="weather-detail-value">${3 + Math.floor(Math.random() * 5)}km/h</div>
        </div>
        <div class="weather-detail-item">
          <div class="weather-detail-label">紫外线</div>
          <div class="weather-detail-value">中等</div>
        </div>
      </div>
      <div class="weather-forecast">
        <div class="weather-forecast-title">未来天气</div>
        <div class="weather-forecast-list">
          ${forecasts.map((day, i) => {
            const c = conditions[i % conditions.length];
            return `
              <div class="weather-forecast-item">
                <div class="forecast-day">${day}</div>
                <div class="forecast-icon">${c.icon}</div>
                <div class="forecast-temp">${c.temp + Math.floor(Math.random() * 6 - 3)}°</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==================== 时钟 ====================

let clockInterval = null;

function renderClock() {
  if (clockInterval) clearInterval(clockInterval);

  els.appBody.innerHTML = `
    <div class="clock-app">
      <div class="clock-face">
        <div class="clock-center"></div>
        <div class="clock-hand clock-hand-hour" id="handHour"></div>
        <div class="clock-hand clock-hand-minute" id="handMinute"></div>
        <div class="clock-hand clock-hand-second" id="handSecond"></div>
      </div>
      <div class="clock-digital" id="clockDigital">00:00:00</div>
      <div class="clock-seconds" id="clockSeconds">00秒</div>
      <div class="clock-date-info" id="clockDateInfo"></div>
    </div>
  `;

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const hourDeg = (h % 12) * 30 + m * 0.5;
  const minuteDeg = m * 6 + s * 0.1;
  const secondDeg = s * 6;

  const handHour = $('#handHour');
  const handMinute = $('#handMinute');
  const handSecond = $('#handSecond');
  const clockDigital = $('#clockDigital');
  const clockSeconds = $('#clockSeconds');
  const clockDateInfo = $('#clockDateInfo');

  if (handHour) handHour.style.transform = `rotate(${hourDeg}deg)`;
  if (handMinute) handMinute.style.transform = `rotate(${minuteDeg}deg)`;
  if (handSecond) handSecond.style.transform = `rotate(${secondDeg}deg)`;
  if (clockDigital) clockDigital.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (clockSeconds) clockSeconds.textContent = `${String(s).padStart(2, '0')}秒`;
  if (clockDateInfo) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    clockDateInfo.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
  }
}

// ==================== 日历 ====================

let calendarYear, calendarMonth;

function renderCalendar() {
  const now = new Date();
  calendarYear = now.getFullYear();
  calendarMonth = now.getMonth();
  renderCalendarMonth();
}

function renderCalendarMonth() {
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const today = new Date();

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  let daysHtml = '';

  for (let i = firstDay - 1; i >= 0; i--) {
    daysHtml += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
    daysHtml += `<div class="calendar-day${isToday ? ' today' : ''}">${d}</div>`;
  }

  const remaining = 42 - (firstDay + daysInMonth);
  for (let d = 1; d <= remaining; d++) {
    daysHtml += `<div class="calendar-day other-month">${d}</div>`;
  }

  els.appBody.innerHTML = `
    <div class="calendar-app">
      <div class="calendar-header">
        <div class="calendar-month">${calendarYear}年 ${monthNames[calendarMonth]}</div>
        <div class="calendar-nav">
          <button class="calendar-nav-btn" onclick="changeMonth(-1)">‹</button>
          <button class="calendar-nav-btn" onclick="changeMonth(1)">›</button>
        </div>
      </div>
      <div class="calendar-weekdays">
        <div class="calendar-weekday">日</div>
        <div class="calendar-weekday">一</div>
        <div class="calendar-weekday">二</div>
        <div class="calendar-weekday">三</div>
        <div class="calendar-weekday">四</div>
        <div class="calendar-weekday">五</div>
        <div class="calendar-weekday">六</div>
      </div>
      <div class="calendar-days">${daysHtml}</div>
    </div>
  `;
}

function changeMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendarMonth();
}

// ==================== 相册 ====================

function renderGallery() {
  const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#f6d365', '#89f7fe', '#c3cfe2'];
  const emojis = ['🏔️', '🌅', '🌊', '🌸', '🐱', '🍕', '🎨', '✈️', '🎪'];

  els.appBody.innerHTML = `
    <div class="gallery-app">
      <div class="gallery-grid">
        ${emojis.map((emoji, i) => `
          <div class="gallery-item" style="background:${colors[i]}">${emoji}</div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==================== 音乐 ====================

function renderMusic() {
  els.appBody.innerHTML = `
    <div class="music-app">
      <div class="music-artwork">
        <div class="music-disc">🎵</div>
      </div>
      <div class="music-info">
        <div class="music-song">MIMO 电台</div>
        <div class="music-artist">系统内置</div>
      </div>
      <div class="music-progress">
        <div class="music-progress-bar">
          <div class="music-progress-fill"></div>
        </div>
        <div class="music-time">
          <span>1:23</span>
          <span>3:45</span>
        </div>
      </div>
      <div class="music-controls">
        <button class="music-btn">⏮</button>
        <button class="music-btn music-btn-play" id="musicPlayBtn" onclick="toggleMusic()">▶</button>
        <button class="music-btn">⏭</button>
      </div>
    </div>
  `;
}

let isMusicPlaying = false;
function toggleMusic() {
  isMusicPlaying = !isMusicPlaying;
  const btn = $('#musicPlayBtn');
  if (btn) btn.textContent = isMusicPlaying ? '⏸' : '▶';
}

// ==================== 通讯录 ====================

function renderContacts() {
  const contacts = [
    { name: '张三', phone: '138-0000-1234', color: '#667eea' },
    { name: '李四', phone: '139-0000-5678', color: '#f093fb' },
    { name: '王五', phone: '136-0000-9012', color: '#4facfe' },
    { name: '赵六', phone: '137-0000-3456', color: '#43e97b' },
    { name: '小明', phone: '135-0000-7890', color: '#fa709a' },
    { name: '小红', phone: '133-0000-1111', color: '#a18cd1' }
  ];

  els.appBody.innerHTML = `
    <div class="contacts-app">
      ${contacts.map(c => `
        <div class="contact-item">
          <div class="contact-avatar" style="background:${c.color}">${c.name[0]}</div>
          <div class="contact-info">
            <div class="contact-name">${c.name}</div>
            <div class="contact-phone">${c.phone}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== 相机 ====================

function renderCamera() {
  els.appBody.innerHTML = `
    <div class="camera-app">
      <div class="camera-viewfinder">
        <div class="camera-grid">
          ${Array(9).fill('<div class="camera-grid-line"></div>').join('')}
        </div>
        <div class="camera-placeholder">
          <div class="camera-placeholder-icon">📷</div>
          <div>点击快门拍摄</div>
        </div>
      </div>
      <div class="camera-controls">
        <button class="camera-switch">🔄</button>
        <button class="camera-shutter" onclick="takePhoto()"></button>
        <div style="width:40px"></div>
      </div>
    </div>
  `;
}

function takePhoto() {
  showToast('📸 照片已保存');
}

// ==================== 设置 ====================

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    const data = await res.json();
    if (data.success) {
      state.settings = data.data;
    }
  } catch (err) {
    console.error('加载设置失败:', err);
  }
}

function renderSettings() {
  const s = state.settings;
  els.appBody.innerHTML = `
    <div class="settings-app">
      <div class="settings-group">
        <div class="settings-group-title">显示</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:#f59e0b">☀️</div>
            <span class="settings-item-label">亮度</span>
          </div>
          <input type="range" class="settings-slider" min="0" max="100" value="${s.brightness || 80}" onchange="updateSetting('brightness', this.value)">
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">声音</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:#6366f1">🔊</div>
            <span class="settings-item-label">音量</span>
          </div>
          <input type="range" class="settings-slider" min="0" max="100" value="${s.volume || 60}" onchange="updateSetting('volume', this.value)">
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">通知</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:#10b981">🔔</div>
            <span class="settings-item-label">通知提醒</span>
          </div>
          <div class="toggle-switch${s.notifications !== false ? ' active' : ''}" onclick="toggleSetting(this, 'notifications')"></div>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">安全</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:#ef4444">🔒</div>
            <span class="settings-item-label">自动锁定</span>
          </div>
          <div class="toggle-switch${s.autoLock !== false ? ' active' : ''}" onclick="toggleSetting(this, 'autoLock')"></div>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">关于</div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:#6366f1">📱</div>
            <span class="settings-item-label">设备名称</span>
          </div>
          <span class="settings-item-value">MIMO Phone</span>
        </div>
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:#8b5cf6">ℹ️</div>
            <span class="settings-item-label">系统版本</span>
          </div>
          <span class="settings-item-value">v1.0.0</span>
        </div>
      </div>
    </div>
  `;
}

async function updateSetting(key, value) {
  try {
    const body = {};
    body[key] = Number(value);
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) state.settings = data.data;
  } catch (err) {
    console.error('更新设置失败:', err);
  }
}

function toggleSetting(el, key) {
  el.classList.toggle('active');
  const isActive = el.classList.contains('active');
  updateSetting(key, isActive ? 1 : 0);
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ==================== 初始化 ====================

async function init() {
  await Promise.all([
    loadApps(),
    loadNotes(),
    loadSettings()
  ]);
  updateBattery();
}

init();
