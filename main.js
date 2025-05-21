/* ===== DOM Elements ===== */
const goalInput   = document.getElementById('goalInput');
const generateBtn = document.getElementById('generateBtn');
const planDisplay = document.getElementById('planDisplay');
const taskList    = document.getElementById('taskList');
const statsList   = document.getElementById('statsList');
const drawer      = document.getElementById('chatDrawer');
const drawerClose = document.getElementById('drawerClose');
const chatLog     = document.getElementById('chatLog');
const chatInput   = document.getElementById('chatInput');
const sendMsgBtn  = document.getElementById('sendMsg');

/* ===== Chat Toggle Button ===== */
if (!document.querySelector('.chat-floating-btn')) {
  const chatToggle = document.createElement('button');
  chatToggle.textContent = '💬';
  chatToggle.className   = 'chat-floating-btn';
  chatToggle.onclick     = () => drawer.classList.toggle('hidden');
  document.body.appendChild(chatToggle);
}

/* ===== Helpers ===== */
const STORAGE_KEY = 'tasks';
const loadTasks   = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveTasks   = tasks => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

/* ===== Parse AI Plan ===== */
function parsePlan(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const tasks = [];
  let offset = 0;

  lines.forEach(line => {
    const clean = line.trim();
    // DAY 标记
    const dayMatch = clean.match(/^DAY\s*(\d+)/i);
    if (dayMatch) {
      offset = parseInt(dayMatch[1], 10) - 1;
      return;
    }
    // 任务行判断
    if (/^([-*•\u2022]|\d+\.)\s*/.test(clean)) {
      const withoutBullet = clean.replace(/^([-*•\u2022]|\d+\.)\s*/, '');
      const parts = withoutBullet.split(/[@|·]/);
      tasks.push({
        id      : crypto.randomUUID(),
        date    : new Date(Date.now() + offset * 864e5).toDateString(),
        task    : parts[0].trim(),
        duration: parts[1] ? parts[1].trim() : '?',
        done    : false,
        remindAt: null
      });
    }
  });

  return tasks;
}

/* ===== Render Today's Tasks ===== */
function renderToday(all) {
  const today = new Date().toDateString();
  taskList.innerHTML = '';
  all.filter(t => t.date === today).forEach(t => {
    const li = document.createElement('li');
    // 完成复选框
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = t.done;
    cb.onchange = () => {
      t.done = cb.checked;
      saveTasks(all);
      renderToday(all);
      renderStats(all);
    };
    // 文本和时长
    const span = document.createElement('span');
    let durNum  = parseFloat(t.duration.replace(/[^0-9.]/g, ''));
    let durText = isNaN(durNum) ? '' : ` · ${durNum} ${durNum === 1 ? 'hour' : 'hours'}`;
    span.textContent = `${t.task}${durText}`;
    span.className   = 'task-text' + (t.done ? ' done' : '');
    // 提醒按钮
    const btn = document.createElement('button');
    btn.innerHTML   = '⏰';
    btn.className   = 'remind-btn';
    btn.onclick     = () => setReminder(t, all);

    li.append(cb, span, btn);
    taskList.append(li);
  });
}

/* ===== Past Completion Stats ===== */
function renderStats(all) {
  const today = new Date();
  const byDate = {};

  all.forEach(t => {
    const taskDate = new Date(t.date);
    // 跳过今天及未来
    if (taskDate.getTime() >= today.setHours(0,0,0,0)) return;

    const dateStr = t.date;
    if (!byDate[dateStr]) byDate[dateStr] = { done: 0, total: 0 };
    byDate[dateStr].total++;
    if (t.done) byDate[dateStr].done++;
  });

  const dates = Object.keys(byDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  statsList.innerHTML = "";
  dates.forEach(d => {
    const { done, total } = byDate[d];
    const li = document.createElement("li");
    li.innerHTML = `<span>${d}</span><span>${done} / ${total}</span>`;
    statsList.append(li);
  });
}

/* ===== Notifications ===== */
function scheduleNotification(text, delay, task) {
  setTimeout(() => {
    const n = new Notification('Reminder', { body: text });
    n.onclick = () => openChat(task);
  }, delay);
}
function scheduleSaved(all) {
  if (!('Notification' in window)) return;
  const now = Date.now();
  all.forEach(t => {
    if (t.remindAt) {
      const d = t.remindAt - now;
      if (d > 0) scheduleNotification(t.task, d, t);
    }
  });
}

/* ===== Reminder Flow ===== */
function setReminder(task, all) {
  if (!('Notification' in window)) {
    return alert('Notifications unsupported');
  }
  Notification.requestPermission().then(p => {
    if (p !== 'granted') return alert('Permission denied');
    const hhmm = prompt('HH:MM 24h', '18:00');
    if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return;
    const [h, m] = hhmm.split(':').map(Number);
    const t = new Date(); t.setHours(h, m, 0, 0);
    const delay = t - Date.now();
    if (delay <= 0) return alert('Time passed');
    task.remindAt = t.getTime();
    saveTasks(all);
    scheduleNotification(task.task, delay, task);
    alert('Reminder set 👍');
  });
}

/* ===== Chat Drawer ===== */
function openChat(task) {
  drawer.classList.remove('hidden');
  chatLog.innerHTML = '<p><strong>AI:</strong> Did you finish this task? Tell me if you need help.</p>';
  chatInput.value = '';
  drawer.dataset.taskId = task.id;
}
drawerClose.onclick = () => drawer.classList.add('hidden');

/* ===== Generate Plan ===== */
generateBtn.onclick = async () => {
  const goal = goalInput.value.trim();
  if (!goal) return alert('Please enter a goal!');
  planDisplay.textContent = 'Generating…';

  const res = await fetch('/api/plan', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ goal })
  });
  const { plan } = await res.json();
  planDisplay.textContent = plan;

  const tasks = parsePlan(plan);
  saveTasks(tasks);
  renderToday(tasks);
  renderStats(tasks);
  scheduleSaved(tasks);
};

/* ===== Send Chat & Adjust ===== */
sendMsgBtn.onclick = async () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatLog.insertAdjacentHTML('beforeend', `<p><strong>You:</strong> ${msg}</p>`);
  chatInput.value = '';

  const tasks      = loadTasks();
  const unfinished = tasks.filter(t => !t.done && t.date === new Date().toDateString());
  // 调用 /api/adjust
  const res = await fetch('/api/adjust', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ unfinished, feedback: msg })
  });
  const { plan } = await res.json();
  
  // 更新任务
  chatLog.insertAdjacentHTML('beforeend', `<p><strong>AI:</strong><br>${plan.replace(/\n/g, '<br>')}</p>`);

  // 只更新当天的任务
  const newTasks = parsePlan(plan);
  const updatedTasks = tasks.map(t => {
    if (t.date === new Date().toDateString()) {
      const updatedTask = newTasks.find(newT => newT.task === t.task);
      return updatedTask ? updatedTask : t;
    }
    return t;
  });

  saveTasks(updatedTasks);
  renderToday(updatedTasks);  // 只渲染今天的任务
  renderStats(updatedTasks);  // 更新统计
  scheduleSaved(updatedTasks);
};

/* ===== Init ===== */
if ('Notification' in window) Notification.requestPermission();
const cached = loadTasks();
if (cached.length) {
  renderToday(cached);
  renderStats(cached);
  scheduleSaved(cached);
}
