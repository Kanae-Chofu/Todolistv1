let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function calculateAverageTime(name) {
  const all = collectAllTasks();
  const matched = all.filter(t => t.name === name && t.finished && t.time > 0);
  if (matched.length === 0) return null;
  const total = matched.reduce((sum, t) => sum + t.time, 0);
  return Math.floor(total / matched.length);
}

function collectAllTasks() {
  let all = [];
  tasks.forEach(t => {
    all.push(t);
    if (t.subtasks) all.push(...t.subtasks);
  });
  return all;
}

function renderTasks() {
  const container = document.getElementById("taskList");
  container.innerHTML = "";
  tasks.forEach((task, i) => {
    const div = createTaskElement(task, i, false);
    container.appendChild(div);
  });
}

function createTaskElement(task, index, isSubtask) {
  if (task.finished) return document.createElement("div");

  const div = document.createElement("div");
  div.className = isSubtask ? "subtask" : "task";

  // 締切チェック
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const now = new Date();
    const diff = due - now;
    if (diff < 0) {
      div.classList.add("overdue");
    } else if (diff < 24 * 60 * 60 * 1000) {
      div.classList.add("due-soon");
    }
  }

  const title = document.createElement("span");
  title.textContent = task.name;

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = formatTime(task.time);

  const avg = document.createElement("span");
  avg.className = "avg-time";
  const avgTime = calculateAverageTime(task.name);
  if (avgTime !== null) avg.textContent = `平均: ${formatTime(avgTime)}`;

  const controls = document.createElement("div");
  controls.className = "controls";

  const startBtn = document.createElement("button");
  startBtn.textContent = task.running ? "⏸ 停止" : "▶️ 開始";
  startBtn.onclick = () => toggleTimer(task);

  const finishBtn = document.createElement("button");
  finishBtn.textContent = "✔️ 終了";
  finishBtn.onclick = () => finishTask(task);

  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑 削除";
  delBtn.onclick = () => deleteTask(task, index, isSubtask);

  controls.appendChild(avg);
  controls.appendChild(time);
  controls.appendChild(startBtn);
  controls.appendChild(finishBtn);
  controls.appendChild(delBtn);

  if (!isSubtask) {
    const subBtn = document.createElement("button");
    subBtn.textContent = "＋ 分割";
    subBtn.onclick = () => showSubtaskInput(task);
    const dueBtn = document.createElement("button");
    dueBtn.textContent = "📅 締切設定";
    dueBtn.onclick = () => setDueDate(task);
    controls.appendChild(subBtn);
    controls.appendChild(dueBtn);
  }

  div.appendChild(title);
  div.appendChild(controls);

  // 締切表示
  if (task.dueDate) {
    const due = document.createElement("div");
    due.textContent = `締切: ${new Date(task.dueDate).toLocaleString()}`;
    due.style.fontSize = "0.8em";
    due.style.color = "#777";
    div.appendChild(due);
  }

  // 進捗バー
  if (!isSubtask && task.subtasks && task.subtasks.length > 0) {
    const completed = task.subtasks.filter(st => st.finished).length;
    const total = task.subtasks.length;
    const progress = document.createElement("div");
    progress.className = "progress-bar";

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${(completed / total) * 100}%`;

    progress.appendChild(fill);
    div.appendChild(progress);
  }

  if (task.subtasks) {
    task.subtasks.forEach((st, idx) => {
      const stEl = createTaskElement(st, idx, true);
      div.appendChild(stEl);
    });
  }

  return div;
}

function showSubtaskInput(task) {
  const name = prompt("サブタスク名を入力:");
  if (name) {
    task.subtasks = task.subtasks || [];
    task.subtasks.push({
      name,
      time: 0,
      running: false,
      lastStart: null,
      finished: false
    });
    saveTasks();
    renderTasks();
  }
}

function setDueDate(task) {
  const dateStr = prompt("締切日時を入力（例: 2025-05-08T15:00）:");
  if (dateStr) {
    const date = new Date(dateStr);
    if (!isNaN(date)) {
      task.dueDate = date.toISOString();
      saveTasks();
      renderTasks();
    } else {
      alert("無効な日時です。");
    }
  }
}

function addTask() {
  const input = document.getElementById("taskInput");
  const name = input.value.trim();
  if (!name) return;
  tasks.push({
    name,
    time: 0,
    running: false,
    lastStart: null,
    finished: false,
    subtasks: [],
    dueDate: null
  });
  input.value = "";
  saveTasks();
  renderTasks();
}

function toggleTimer(task) {
  if (task.running) {
    const now = Date.now();
    task.time += Math.floor((now - task.lastStart) / 1000);
    task.running = false;
    task.lastStart = null;
  } else {
    task.running = true;
    task.lastStart = Date.now();
  }
  saveTasks();
  renderTasks();
}

function finishTask(task) {
  if (task.running) {
    const now = Date.now();
    task.time += Math.floor((now - task.lastStart) / 1000);
    task.running = false;
  }
  task.finished = true;
  task.lastStart = null;
  saveTasks();
  renderTasks();
}

function deleteTask(task, index, isSubtask) {
  if (isSubtask) {
    tasks.forEach(t => {
      if (t.subtasks) {
        const idx = t.subtasks.indexOf(task);
        if (idx !== -1) t.subtasks.splice(idx, 1);
      }
    });
  } else {
    tasks.splice(index, 1);
  }
  saveTasks();
  renderTasks();
}

// タイマー更新ループ
setInterval(() => {
  let updated = false;
  const all = collectAllTasks();
  all.forEach((task) => {
    if (task.running && task.lastStart) {
      task.time += 1;
      task.lastStart = Date.now();
      updated = true;
    }
  });
  if (updated) {
    saveTasks();
    renderTasks();
  }
}, 1000);

document.getElementById("addBtn").onclick = addTask;
renderTasks();
let selectedDueTask = null;

function setDueDate(task) {
  selectedDueTask = task;
  const input = document.getElementById("dueInput");
  if (task.dueDate) {
    input.value = task.dueDate.slice(0, 16); // YYYY-MM-DDTHH:mm
  } else {
    input.value = "";
  }
  document.getElementById("dueModal").classList.remove("hidden");
}

document.getElementById("saveDueBtn").onclick = () => {
  const input = document.getElementById("dueInput");
  if (selectedDueTask && input.value) {
    selectedDueTask.dueDate = new Date(input.value).toISOString();
    saveTasks();
    renderTasks();
  }
  selectedDueTask = null;
  document.getElementById("dueModal").classList.add("hidden");
};

document.getElementById("cancelDueBtn").onclick = () => {
  selectedDueTask = null;
  document.getElementById("dueModal").classList.add("hidden");
};
