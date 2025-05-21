const API_BASE = "https://time-planner-backend.onrender.com";

const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const planSection = document.getElementById("plan-section");
const taskBoard = document.getElementById("task-board");

let currentUserId = null;

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

// 显示主计划页
async function showPlanSection() {
  loginSection.style.display = "none";
  registerSection.style.display = "none";
  planSection.style.display = "block";

  await loadTasks();
}

// 加载任务并渲染
async function loadTasks() {
  taskBoard.innerHTML = "<p>正在加载任务...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/tasks/${currentUserId}`);
    const data = await res.json();

    if (!res.ok) {
      taskBoard.innerHTML = "<p>加载任务失败</p>";
      return;
    }

    const grouped = {};
    for (const task of data.tasks) {
      const date = task.date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(task);
    }

    taskBoard.innerHTML = "";
for (const date in grouped) {
  const section = document.createElement("div");
  section.className = "task-day";

  // ✅ 美化日期格式
  const d = new Date(date);
  const formattedDate = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  const title = document.createElement("h3");
  title.textContent = `📅 ${formattedDate}`;
  section.appendChild(title);

  grouped[date].forEach(t => {
    const item = document.createElement("div");
    item.className = "task-item";

    // ✅ 创建复选框
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.done; // 根据任务状态设置初始值
    checkbox.className = "task-checkbox";

    // ✅ 创建任务内容
    const content = document.createElement("span");
    content.textContent = `📝 ${t.task} (${t.duration}小时)`;
    if (t.done) content.style.textDecoration = "line-through";

    // ✅ 勾选状态改变时发送 PATCH 请求
    checkbox.onchange = async () => {
      const done = checkbox.checked;
      content.style.textDecoration = done ? "line-through" : "none";
      await fetch(`${API_BASE}/api/tasks/${t.id}/done`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
    };

    item.appendChild(checkbox);
    item.appendChild(content);
    section.appendChild(item);
  });

  taskBoard.appendChild(section);
}

  } catch (err) {
    taskBoard.innerHTML = "<p>连接失败，请稍后重试</p>";
  }
}

// 生成 7 天计划
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

// 退出登录
document.getElementById("logout-btn").onclick = () => {
  currentUserId = null;
  planSection.style.display = "none";
  loginSection.style.display = "block";
};
