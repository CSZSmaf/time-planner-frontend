const API_BASE = "https://time-planner-backend.onrender.com";

const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const planSection = document.getElementById("plan-section");
const taskBoard = document.getElementById("task-board");

let currentUserId = null;
let currentEditTaskId = null;

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

    const grouped = {};
    for (const task of data) {
      const dateKey = task.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);
    }

    taskBoard.innerHTML = "";
    for (const date in grouped) {
      const section = document.createElement("div");
      section.className = "task-day";

      const d = new Date(date);
      const title = document.createElement("h3");
      title.textContent = `📅 ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      section.appendChild(title);

      const doneList = grouped[date].filter((t) => t.done);
      const undoneList = grouped[date].filter((t) => !t.done);

      renderList(doneList, "✅ 已完成任务：", section);
      renderList(undoneList, "🕒 未完成任务：", section);

      taskBoard.appendChild(section);
    }
  } catch (err) {
    taskBoard.innerHTML = "<p>连接失败，请稍后重试</p>";
  }
}

function renderList(tasks, label, section) {
  if (tasks.length === 0) return;
  const subTitle = document.createElement("p");
  subTitle.textContent = label;
  subTitle.style.fontWeight = "bold";
  subTitle.style.margin = "8px 0 4px";
  section.appendChild(subTitle);

  tasks.forEach((t) => {
    const item = document.createElement("div");
    item.className = "task-item";
    item.dataset.id = t.id;

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
    duration.textContent = t.duration;

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "✏️";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "🗑️";
    deleteBtn.style.color = "red";

    checkbox.onchange = async () => {
      const done = checkbox.checked;
      await fetch(`${API_BASE}/api/tasks/${t.id}/done`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      await loadTasks();
    };

    editBtn.onclick = () => {
      currentEditTaskId = t.id;
      document.getElementById("edit-task-text").value = t.task;
      document.getElementById("edit-duration").value = t.duration;
      document.getElementById("edit-modal").style.display = "block";
    };

    deleteBtn.onclick = async () => {
      if (confirm("确定要删除这个任务吗？")) {
        await fetch(`${API_BASE}/api/tasks/${t.id}`, {
          method: "DELETE",
        });
        await loadTasks();
      }
    };

    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(duration);
    item.appendChild(editBtn);
    item.appendChild(deleteBtn);
    section.appendChild(item);
  });
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
  entry.innerHTML = `<strong>${sender}</strong> ${text}`;
  chat.appendChild(entry);
  chat.scrollTop = chat.scrollHeight;
}
