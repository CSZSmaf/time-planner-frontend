const API_BASE = "https://time-planner-backend.onrender.com";

const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const planSection = document.getElementById("plan-section");
const taskBoard = document.getElementById("task-board");

let currentUserId = null;
let currentEditTaskId = null;
let focusInterval = null;
let currentFocusTask = null;
let currentElapsed = 0;

// 页面切换
document.getElementById("go-register").onclick = () => {
  loginSection.style.display = "none";
  registerSection.style.display = "block";
};

document.getElementById("go-login").onclick = () => {
  registerSection.style.display = "none";
  loginSection.style.display = "block";
};

// 登录
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      currentUserId = data.userId;
      showPlanSection();
    } else {
      alert(data.error || "登录失败");
    }
  } catch (err) {
    alert("无法连接服务器，请检查网络或后端部署状态");
  }
};

// 注册
document.getElementById("register-btn").onclick = async () => {
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  try {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("注册成功，请登录");
      registerSection.style.display = "none";
      loginSection.style.display = "block";
    } else {
      alert(data.error || "注册失败");
    }
  } catch (err) {
    alert("无法连接服务器，请检查网络或后端部署状态");
  }
};

async function showPlanSection() {
  loginSection.style.display = "none";
  registerSection.style.display = "none";
  planSection.style.display = "block";
  await loadTasks();
}

async function loadTasks() {
  taskBoard.innerHTML = "<p>正在加载任务...</p>";
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${currentUserId}`);
    const data = await res.json();

    // 按日期分组
    const grouped = {};
    for (const task of data) {
      const dateKey = task.date.slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);
    }

    taskBoard.innerHTML = "";
    const today = new Date().toISOString().slice(0, 10);

    for (const date in grouped) {
      const section = document.createElement("div");
      section.className = "task-day";

      // 标题
      const d = new Date(date);
      const title = document.createElement("h3");
      title.textContent = `📅 ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      section.appendChild(title);

      // 判断是否为今天
      const isToday = date === today;
      // 列表容器
      const listContainer = document.createElement("div");
      listContainer.style.display = isToday ? "block" : "none";

      // 展开/收起按钮
      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = isToday ? "收起" : "展开";
      toggleBtn.style.margin = "4px 0";
      toggleBtn.onclick = () => {
        if (listContainer.style.display === "none") {
          listContainer.style.display = "block";
          toggleBtn.textContent = "收起";
        } else {
          listContainer.style.display = "none";
          toggleBtn.textContent = "展开";
        }
      };
      section.appendChild(toggleBtn);
      section.appendChild(listContainer);

      // 渲染已完成 & 未完成
      const doneList = grouped[date].filter((t) => t.done);
      const undoneList = grouped[date].filter((t) => !t.done);
      renderList(doneList, "✅ 已完成任务：", listContainer);
      renderList(undoneList, "🕒 未完成任务：", listContainer);

      taskBoard.appendChild(section);
    }
  } catch (err) {
    taskBoard.innerHTML = "<p>连接失败，请稍后重试</p>";
  }
}

// 渲染任务列表至指定容器
function renderList(tasks, label, container) {
  if (tasks.length === 0) return;
  const subTitle = document.createElement("p");
  subTitle.textContent = label;
  subTitle.style.fontWeight = "bold";
  subTitle.style.margin = "8px 0 4px";
  container.appendChild(subTitle);

  tasks.forEach((t) => {
    const item = document.createElement("div");
    item.className = "task-item";
    item.dataset.id = t.id;

    const leftSide = document.createElement("div");
    leftSide.style.display = "flex";
    leftSide.style.alignItems = "center";
    leftSide.style.gap = "10px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done;
    checkbox.className = "task-checkbox";

    const content = document.createElement("span");
    content.className = "task-text";
    content.textContent = `📝 ${t.task}`;
    if (t.done) content.style.textDecoration = "line-through";

    const duration = document.createElement("span");
    duration.className = "duration";
    duration.textContent = `${t.duration}h`;

    leftSide.appendChild(checkbox);
    leftSide.appendChild(content);
    leftSide.appendChild(duration);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    // 提醒按钮
    const remindBtn = document.createElement("button");
    remindBtn.textContent = "⏰ 提醒";
    remindBtn.onclick = () => {
      const time = prompt("请输入提醒时间（格式如：2025-05-21T15:30）", new Date().toISOString().slice(0, 16));
      if (time) {
        localStorage.setItem(`reminder_${t.id}`, time);
        alert(`提醒已设置：${time.replace('T', ' ')}`);
      }
    };

    // 专注按钮
    const focusBtn = document.createElement("button");
    focusBtn.textContent = "🧘 专注";
    focusBtn.onclick = () => {
      currentFocusTask = t;
      currentElapsed = t.elapsed_seconds || 0;
      document.getElementById("focus-time").textContent = formatTime(currentElapsed);
      document.getElementById("focus-modal").style.display = "flex";
      document.documentElement.requestFullscreen?.();
      startFocusTimer();
    };

    // 编辑按钮
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => {
      currentEditTaskId = t.id;
      document.getElementById("edit-task-text").value = t.task;
      document.getElementById("edit-duration").value = t.duration;
      document.getElementById("edit-modal").style.display = "block";
    };

    // 删除按钮
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = async () => {
      if (confirm("确定要删除这个任务吗？")) {
        await fetch(`${API_BASE}/api/tasks/${t.id}`, { method: "DELETE" });
        await loadTasks();
      }
    };

    checkbox.onchange = async () => {
      const done = checkbox.checked;
      await fetch(`${API_BASE}/api/tasks/${t.id}/done`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      await loadTasks();
    };

    actions.appendChild(remindBtn);
    actions.appendChild(focusBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(leftSide);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startFocusTimer() {
  const timeDisplay = document.getElementById("focus-time");
  clearInterval(focusInterval);
  focusInterval = setInterval(() => {
    currentElapsed++;
    timeDisplay.textContent = formatTime(currentElapsed);
  }, 1000);

  // 同步已学时
  setInterval(async () => {
    if (currentFocusTask) {
      await fetch(`${API_BASE}/api/tasks/${currentFocusTask.id}/elapsed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elapsed: currentElapsed })
      });
    }
  }, 60000);
}

function closeFocus() {
  clearInterval(focusInterval);
  document.getElementById("focus-modal").style.display = "none";
  focusInterval = null;
  currentFocusTask = null;
  document.exitFullscreen?.();
}

// 保存编辑任务
document.getElementById("save-edit").onclick = async () => {
  const task = document.getElementById("edit-task-text").value;
  const duration = parseFloat(document.getElementById("edit-duration").value);

  await fetch(`${API_BASE}/api/tasks/${currentEditTaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, duration })
  });

  document.getElementById("edit-modal").style.display = "none";
  loadTasks();
};

// 取消编辑
document.getElementById("cancel-edit").onclick = () => {
  document.getElementById("edit-modal").style.display = "none";
};

// 生成计划
document.getElementById("generate-plan").onclick = async () => {
  const goal = document.getElementById("goal-input").value;
  if (!goal) return alert("请先填写学习目标");

  try {
    const res = await fetch(`${API_BASE}/api/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, userId: currentUserId }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("计划生成成功！");
      await loadTasks();
    } else {
      alert(data.error || "生成失败");
    }
  } catch (err) {
    alert("生成失败：无法连接 AI 服务或后端，请稍后再试");
  }
};

// 添加任务
document.getElementById("add-task-btn").onclick = async () => {
  const task = document.getElementById("manual-task").value.trim();
  const date = document.getElementById("manual-date").value;
  const duration = parseFloat(document.getElementById("manual-duration").value);

  if (!task || !date || !duration) {
    alert("请完整填写任务内容、日期和时长");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, task, duration, date }),
    });

    if (res.ok) {
      alert("任务添加成功！");
      document.getElementById("manual-task").value = "";
      document.getElementById("manual-date").value = "";
      document.getElementById("manual-duration").value = "";
      await loadTasks();
    } else {
      alert("任务添加失败");
    }
  } catch (err) {
    alert("网络错误，添加失败");
  }
};

// 退出登录
document.getElementById("logout-btn").onclick = () => {
  currentUserId = null;
  planSection.style.display = "none";
  loginSection.style.display = "block";
};

// 聊天功能
document.getElementById("chat-toggle").onclick = () => {
  const chatBox = document.getElementById("chat-box");
  chatBox.style.display = chatBox.style.display === "none" ? "flex" : "none";
};

document.getElementById("chat-send").onclick = async () => {
  const input = document.getElementById("chat-input");
  const msg = input.value.trim();
  if (!msg) return;

  appendMessage("🧑‍🎓 你：", msg);
  input.value = "";

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    appendMessage("🤖 AI：", data.reply || "无回复");
  } catch (err) {
    appendMessage("⚠️ 系统：", "连接失败，请稍后再试。");
  }
};

function appendMessage(sender, text) {
  const chat = document.getElementById("chat-messages");
  const entry = document.createElement("div");

  // 使用 marked 解析 Markdown
  const html = marked.parse(text || "");
  entry.innerHTML = `<strong>${sender}</strong><div class=\"markdown\">${html}</div>`;

  chat.appendChild(entry);
  chat.scrollTop = chat.scrollHeight;
}

// 初始化通知权限
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// 每 30 秒轮询提醒列表
setInterval(() => {
  if ("Notification" in window && Notification.permission === "granted") {
    const now = new Date();
    for (let key in localStorage) {
      if (key.startsWith("reminder_")) {
        const time = new Date(localStorage.getItem(key));
        if (Math.abs(time - now) < 30000) {
          const taskId = key.replace("reminder_", "");
          const taskText = document.querySelector(`[data-id='${taskId}'] .task-text`)?.textContent || "某个任务";
          new Notification("⏰ 时间到啦！", { body: `请开始：${taskText}` });
          localStorage.removeItem(key);
        }
      }
    }
  }
}, 30000);
