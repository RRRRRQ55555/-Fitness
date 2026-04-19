const defaultCatalog = {
  肩部: [
    { name: "哑铃推肩", caloriesPerRep: 0.9 },
    { name: "侧平举", caloriesPerRep: 0.6 },
    { name: "前平举", caloriesPerRep: 0.55 },
  ],
  背部: [
    { name: "引体向上", caloriesPerRep: 1.2 },
    { name: "俯身划船", caloriesPerRep: 0.95 },
    { name: "高位下拉", caloriesPerRep: 0.85 },
  ],
  胸部: [
    { name: "卧推", caloriesPerRep: 1.05 },
    { name: "俯卧撑", caloriesPerRep: 0.8 },
    { name: "飞鸟", caloriesPerRep: 0.75 },
  ],
  腿部: [
    { name: "深蹲", caloriesPerRep: 1.15 },
    { name: "硬拉", caloriesPerRep: 1.25 },
    { name: "弓步蹲", caloriesPerRep: 0.95 },
  ],
  手臂肌肉: [
    { name: "哑铃弯举", caloriesPerRep: 0.62 },
    { name: "绳索下压", caloriesPerRep: 0.58 },
    { name: "锤式弯举", caloriesPerRep: 0.6 },
  ],
};

const state = {
  selectedCategories: new Set(),
  selectedExerciseIds: new Set(),
  plan: [],
  activeIndex: 0,
  restRemaining: 0,
  restTimer: null,
};

const els = {
  categoryGrid: document.querySelector("#categoryGrid"),
  buildPlanBtn: document.querySelector("#buildPlanBtn"),
  exercisePicker: document.querySelector("#exercisePicker"),
  selectedPlan: document.querySelector("#selectedPlan"),
  savePlanBtn: document.querySelector("#savePlanBtn"),
  workoutPanel: document.querySelector("#workoutPanel"),
  workoutCard: document.querySelector("#workoutCard"),
  historyList: document.querySelector("#historyList"),
  openExerciseManager: document.querySelector("#openExerciseManager"),
  exerciseDialog: document.querySelector("#exerciseDialog"),
  dialogCategory: document.querySelector("#dialogCategory"),
  dialogExerciseName: document.querySelector("#dialogExerciseName"),
  dialogCalories: document.querySelector("#dialogCalories"),
  saveCustomExercise: document.querySelector("#saveCustomExercise"),
};

const CATALOG_KEY = "fitness-demo-catalog";
const HISTORY_KEY = "fitness-demo-history";

function loadCatalog() {
  const raw = localStorage.getItem(CATALOG_KEY);
  if (!raw) return structuredClone(defaultCatalog);
  try {
    return { ...structuredClone(defaultCatalog), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultCatalog);
  }
}

function saveCatalog(catalog) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

let catalog = loadCatalog();
let history = loadHistory();

function renderCategories() {
  els.categoryGrid.innerHTML = "";
  Object.keys(catalog).forEach((category) => {
    const card = document.createElement("button");
    card.className = `category-card ${state.selectedCategories.has(category) ? "active" : ""}`;
    card.textContent = category;
    card.addEventListener("click", () => {
      state.selectedCategories.has(category)
        ? state.selectedCategories.delete(category)
        : state.selectedCategories.add(category);
      renderCategories();
    });
    els.categoryGrid.append(card);
  });
}

function exerciseId(category, name) {
  return `${category}::${name}`;
}

function renderExercisePicker() {
  els.exercisePicker.innerHTML = "";

  if (state.selectedCategories.size === 0) {
    els.exercisePicker.innerHTML = '<p class="hint">请先选择至少一个训练分类。</p>';
    return;
  }

  [...state.selectedCategories].forEach((category) => {
    const group = document.createElement("div");
    group.className = "exercise-group";

    const title = document.createElement("h4");
    title.textContent = category;

    const list = document.createElement("div");
    list.className = "exercise-list";

    catalog[category].forEach((exercise) => {
      const id = exerciseId(category, exercise.name);
      const pill = document.createElement("button");
      pill.className = `exercise-pill ${state.selectedExerciseIds.has(id) ? "selected" : ""}`;
      pill.textContent = `${exercise.name} (${exercise.caloriesPerRep.toFixed(2)} kcal/次)`;
      pill.addEventListener("click", () => {
        state.selectedExerciseIds.has(id)
          ? state.selectedExerciseIds.delete(id)
          : state.selectedExerciseIds.add(id);
        renderExercisePicker();
        buildDraftPlanFromSelection();
      });
      list.append(pill);
    });

    group.append(title, list);
    els.exercisePicker.append(group);
  });
}

function buildDraftPlanFromSelection() {
  const selected = [];
  Object.entries(catalog).forEach(([category, exercises]) => {
    exercises.forEach((exercise) => {
      const id = exerciseId(category, exercise.name);
      if (state.selectedExerciseIds.has(id)) {
        selected.push({
          id,
          category,
          name: exercise.name,
          caloriesPerRep: exercise.caloriesPerRep,
          reps: 12,
          restSec: 40,
        });
      }
    });
  });

  const prevById = Object.fromEntries(state.plan.map((item) => [item.id, item]));
  state.plan = selected.map((item) => ({ ...item, ...prevById[item.id] }));
  renderPlanBuilder();
}

function renderPlanBuilder() {
  els.selectedPlan.innerHTML = "";

  if (state.plan.length === 0) {
    els.selectedPlan.innerHTML = '<p class="hint">还未选择动作。请在上方勾选。</p>';
    return;
  }

  state.plan.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "exercise-card";
    row.draggable = true;
    row.dataset.index = String(idx);

    row.innerHTML = `
      <div>
        <strong>${idx + 1}. ${item.name}</strong><br />
        <small>${item.category} · ${item.caloriesPerRep.toFixed(2)} kcal/次</small>
      </div>
      <label class="small">次数
        <input type="number" min="1" value="${item.reps}" data-field="reps" />
      </label>
      <label class="small">休息(秒)
        <input type="number" min="0" value="${item.restSec}" data-field="restSec" />
      </label>
      <button class="ghost" data-remove="true">删除</button>
    `;

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const field = e.target.dataset.field;
        state.plan[idx][field] = Math.max(0, Number(e.target.value || 0));
      });
    });

    row.querySelector("[data-remove='true']").addEventListener("click", () => {
      state.selectedExerciseIds.delete(item.id);
      state.plan.splice(idx, 1);
      renderExercisePicker();
      renderPlanBuilder();
    });

    row.addEventListener("dragstart", () => row.classList.add("dragging"));
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      persistOrderFromDOM();
      renderPlanBuilder();
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = els.selectedPlan.querySelector(".dragging");
      if (!dragging || dragging === row) return;
      const draggingIndex = Number(dragging.dataset.index);
      const overIndex = Number(row.dataset.index);
      if (draggingIndex === overIndex) return;
      if (draggingIndex < overIndex) {
        els.selectedPlan.insertBefore(dragging, row.nextSibling);
      } else {
        els.selectedPlan.insertBefore(dragging, row);
      }
    });

    els.selectedPlan.append(row);
  });
}

function persistOrderFromDOM() {
  const order = [...els.selectedPlan.querySelectorAll(".exercise-card")].map((el) => Number(el.dataset.index));
  if (order.length !== state.plan.length) return;
  state.plan = order.map((originalIndex) => state.plan[originalIndex]);
}

function estimateCalories(plan) {
  return plan.reduce((sum, item) => sum + item.caloriesPerRep * item.reps, 0);
}

function renderWorkout() {
  const current = state.plan[state.activeIndex];
  if (!current) {
    const totalCalories = estimateCalories(state.plan).toFixed(1);
    els.workoutCard.innerHTML = `
      <h3>训练完成 🎉</h3>
      <p>预计总消耗：<strong>${totalCalories} kcal</strong></p>
      <p>本次方案已保存到训练记录。</p>
    `;
    return;
  }

  els.workoutCard.innerHTML = `
    <h3>第 ${state.activeIndex + 1} / ${state.plan.length} 个动作</h3>
    <p><strong>${current.name}</strong>（${current.category}）</p>
    <p>目标：${current.reps} 次</p>
    <p>预计动作消耗：${(current.reps * current.caloriesPerRep).toFixed(1)} kcal</p>
    <p>休息倒计时：<strong>${state.restRemaining}</strong> 秒</p>
    <div class="actions-row">
      <button id="prevStep" class="ghost">上一个动作</button>
      <button id="completeStep" class="primary">完成动作</button>
    </div>
  `;

  els.workoutCard.querySelector("#completeStep").addEventListener("click", () => {
    const rest = Number(current.restSec || 0);
    state.activeIndex += 1;
    startRestTimer(rest);
  });

  els.workoutCard.querySelector("#prevStep").addEventListener("click", () => {
    state.activeIndex = Math.max(0, state.activeIndex - 1);
    clearRestTimer();
    renderWorkout();
  });
}

function clearRestTimer() {
  if (state.restTimer) {
    clearInterval(state.restTimer);
    state.restTimer = null;
  }
  state.restRemaining = 0;
}

function startRestTimer(seconds) {
  clearRestTimer();
  state.restRemaining = seconds;
  renderWorkout();

  if (seconds <= 0) return;

  state.restTimer = setInterval(() => {
    state.restRemaining -= 1;
    if (state.restRemaining <= 0) {
      clearRestTimer();
    }
    renderWorkout();
  }, 1000);
}

function saveCurrentPlanAsHistory() {
  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    totalCalories: Number(estimateCalories(state.plan).toFixed(1)),
    items: state.plan,
  };
  history.unshift(record);
  history = history.slice(0, 20);
  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (history.length === 0) {
    els.historyList.innerHTML = '<p class="hint">暂无训练记录。</p>';
    return;
  }

  history.forEach((record) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const date = new Date(record.createdAt).toLocaleString();
    item.innerHTML = `
      <strong>${date}</strong>
      <p>动作数：${record.items.length}，预计消耗：${record.totalCalories} kcal</p>
      <small>${record.items.map((i) => `${i.name}×${i.reps}`).join(" · ")}</small>
    `;
    els.historyList.append(item);
  });
}

function initDialog() {
  els.dialogCategory.innerHTML = Object.keys(catalog)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  els.openExerciseManager.addEventListener("click", () => {
    els.exerciseDialog.showModal();
  });

  els.saveCustomExercise.addEventListener("click", (e) => {
    e.preventDefault();
    const category = els.dialogCategory.value;
    const name = els.dialogExerciseName.value.trim();
    const calories = Number(els.dialogCalories.value);
    if (!name || calories <= 0) return;

    const exists = catalog[category].some((it) => it.name === name);
    if (!exists) {
      catalog[category].push({ name, caloriesPerRep: Number((calories / 10).toFixed(2)) });
      saveCatalog(catalog);
      renderExercisePicker();
    }

    els.dialogExerciseName.value = "";
    els.dialogCalories.value = "6";
    els.exerciseDialog.close();
  });
}

function bindEvents() {
  els.buildPlanBtn.addEventListener("click", () => {
    renderExercisePicker();
    buildDraftPlanFromSelection();
  });

  els.savePlanBtn.addEventListener("click", () => {
    if (state.plan.length === 0) return alert("请先选择并配置动作。");
    saveCurrentPlanAsHistory();
    state.activeIndex = 0;
    clearRestTimer();
    els.workoutPanel.classList.remove("hidden");
    renderWorkout();
  });
}

function init() {
  renderCategories();
  renderExercisePicker();
  renderPlanBuilder();
  renderHistory();
  initDialog();
  bindEvents();
}

init();
