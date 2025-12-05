const $ = id => document.getElementById(id);

const addBtn = $("addBtn");
const todoInput = $("todoInput");
const todoList = $("todoList");
const pagination = $("pagination");
const errorBox = document.querySelector(".error-message");

let todos = []; // локальный массив задач
const itemsPerPage = 3;
let currentPage = 1;

/* ===== Загрузка задач из Supabase ===== */
loadTodos();

async function loadTodos() {
  try {
    const { data, error } = await supabase
      .from("whattodoapp")      // <-- твоя таблица
      .select("id, text")
      .order("id", { ascending: false });

    if (!error && data) {
      todos = data.map(t => ({ id: t.id, text: t.text }));
      localStorage.setItem("todos", JSON.stringify(todos));
    } else {
      todos = JSON.parse(localStorage.getItem("todos")) || [];
    }
  } catch (e) {
    todos = JSON.parse(localStorage.getItem("todos")) || [];
  }

  render();
}

/* ===== Добавление задачи ===== */
addBtn.onclick = async () => {
  const text = todoInput.value.trim();
  if (!text) return showError("Enter a task");

  todos.unshift({ text }); // добавляем локально
  localStorage.setItem("todos", JSON.stringify(todos));
  todoInput.value = "";
  currentPage = 1;
  render();

  try {
    const { data, error } = await supabase
      .from("whattodoapp")      // <-- твоя таблица
      .insert([{ text }])
      .select("id, text")
      .limit(1);

    if (!error && data?.length) {
      todos[0] = { id: data[0].id, text: data[0].text }; // обновляем id
      localStorage.setItem("todos", JSON.stringify(todos));
      render();
    }
  } catch (e) {
    showError("Saved locally — will sync when online");
  }
};

/* ===== Рендер всех задач ===== */
function render() {
  renderTodos();
  renderPagination();
}

function renderTodos() {
  todoList.innerHTML = "";
  const start = (currentPage - 1) * itemsPerPage;

  todos.slice(start, start + itemsPerPage).forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = `
      <span class="todo-text">${escapeHtml(item.text)}</span>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    `;

    li.querySelector(".edit-btn").onclick = () => editTask(start + i, li);
    li.querySelector(".delete-btn").onclick = () => deleteTask(start + i);

    todoList.append(li);
  });
}

/* ===== Пагинация ===== */
function renderPagination() {
  pagination.innerHTML = "";
  const pages = Math.max(1, Math.ceil(todos.length / itemsPerPage));

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = "pagination-btn";
    btn.textContent = i;
    btn.disabled = i === currentPage;
    btn.onclick = () => { currentPage = i; render(); };
    pagination.append(btn);
  }
}

/* ===== Редактирование задачи ===== */
function editTask(index, li) {
  const item = todos[index];
  li.innerHTML = `
    <input class="todo-text" value="${escapeHtml(item.text)}">
    <button class="save-btn">Save</button>
    <button class="delete-btn">Delete</button>
  `;

  li.querySelector(".save-btn").onclick = async () => {
    const value = li.querySelector("input").value.trim();
    if (!value) return showError("Task cannot be empty");

    const old = item;
    todos[index].text = value;
    localStorage.setItem("todos", JSON.stringify(todos));
    render();

    if (old.id) {
      try {
        await supabase
          .from("whattodoapp")     // <-- твоя таблица
          .update({ text: value })
          .eq("id", old.id);
      } catch (e) {
        showError("Saved locally — will sync when online");
      }
    }
  };

  li.querySelector(".delete-btn").onclick = () => deleteTask(index);
}

/* ===== Удаление задачи ===== */
async function deleteTask(index) {
  const removed = todos.splice(index, 1)[0];
  localStorage.setItem("todos", JSON.stringify(todos));
  if ((currentPage - 1) * itemsPerPage >= todos.length) currentPage = Math.max(1, currentPage - 1);
  render();

  if (removed.id) {
    try {
      await supabase.from("whattodoapp").delete().eq("id", removed.id);
    } catch (e) {
      showError("Deleted locally — will sync when online");
    }
  }
}

/* ===== Вспомогательные функции ===== */
function showError(text) {
  errorBox.textContent = text;
  errorBox.style.display = "block";
  setTimeout(() => (errorBox.style.display = "none"), 3000);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
