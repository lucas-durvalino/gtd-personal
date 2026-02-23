import {
  LIST_TYPES,
  PROJECT_STATUS,
  MILESTONE_STATUS,
  PROJECT_TEMPLATES,
  createTask,
  createProject,
  createMilestone,
  createChecklistItem,
} from "./models.js";

const MAIN_TABS = [
  { id: "agenda", label: "Hoje/Agenda" },
  { id: "inbox", label: "Inbox" },
  { id: "process", label: "Processar" },
  { id: "gtd", label: "GTD" },
  { id: "projects", label: "Projetos" },
  { id: "backup", label: "Backup" },
];

const GTD_SUBTABS = [
  { id: LIST_TYPES.NEXT, label: "Próximas ações" },
  { id: LIST_TYPES.WAITING, label: "Aguardando" },
  { id: LIST_TYPES.DONE, label: "Concluídas" },
  { id: LIST_TYPES.SOMEDAY, label: "Talvez" },
  { id: LIST_TYPES.REFERENCE, label: "Referência" },
];

export function createUI({ state, setState, save, exportJson, importJson, resetAll }) {
  const app = document.getElementById("app");
  const tabs = document.getElementById("main-tabs");

  function notify(text, type = "ok") {
    const msg = document.createElement("div");
    msg.className = `toast ${type}`;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2500);
  }

  function setTab(tab) {
    state.ui.activeTab = tab;
    save();
    render();
  }

  function renderTabs() {
    tabs.innerHTML = MAIN_TABS.map((t) => `<button class="tab ${state.ui.activeTab === t.id ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`).join("");
    tabs.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function sortByDate(a, b, field) {
    const da = parseDate(a[field]);
    const db = parseDate(b[field]);
    if (da && db) return da - db;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return 0;
  }

  function renderAgenda() {
    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const t7 = new Date(t0);
    t7.setDate(t0.getDate() + 7);
    const t30 = new Date(t0);
    t30.setDate(t0.getDate() + 30);

    const tasks = state.tasks
      .filter((t) => t.dueDate && ![LIST_TYPES.INBOX, LIST_TYPES.DONE, LIST_TYPES.REFERENCE].includes(t.listType))
      .map((t) => ({ type: "task", id: t.id, title: t.title, date: t.dueDate, extra: t.context || "Tarefa" }));

    const milestones = state.milestones
      .filter((m) => m.plannedDate)
      .map((m) => {
        const project = state.projects.find((p) => p.id === m.projectId);
        return { type: "milestone", id: m.id, title: `${m.name} (${project?.name || "Projeto"})`, date: m.plannedDate, extra: m.status };
      });

    const items = [...tasks, ...milestones].sort((a, b) => sortByDate(a, b, "date"));

    const sections = {
      vencidas: [],
      hoje: [],
      p7: [],
      p30: [],
    };

    items.forEach((i) => {
      const d = parseDate(i.date);
      if (!d) return;
      if (d < t0) sections.vencidas.push(i);
      else if (d.getTime() === t0.getTime()) sections.hoje.push(i);
      else if (d <= t7) sections.p7.push(i);
      else if (d <= t30) sections.p30.push(i);
    });

    const sectionHtml = (title, arr) => `
      <section class="card">
        <h3>${title}</h3>
        ${arr.length ? `<ul>${arr.map((i) => `<li><strong>${i.date}</strong> — ${i.title} <span class="muted">${i.extra}</span></li>`).join("")}</ul>` : "<p class='muted'>Sem itens.</p>"}
      </section>
    `;

    app.innerHTML = `<div class="grid">${sectionHtml("Vencidas", sections.vencidas)}${sectionHtml("Hoje", sections.hoje)}${sectionHtml("Próximos 7 dias", sections.p7)}${sectionHtml("Próximos 30 dias", sections.p30)}</div>`;
  }

  function renderInbox() {
    const inbox = state.tasks.filter((t) => t.listType === LIST_TYPES.INBOX);
    app.innerHTML = `
      <section class="card">
        <h2>Captura rápida</h2>
        <div class="row">
          <input id="quick-capture" placeholder="Digite algo para capturar" />
          <button id="add-inbox">Adicionar</button>
        </div>
      </section>
      <section class="card">
        <h2>Itens capturados (${inbox.length})</h2>
        <ul>
          ${inbox.map((i) => `<li>${i.title}
            <div class="actions">
              <button data-process="${i.id}">Processar</button>
              <button data-delete="${i.id}" class="danger">Excluir</button>
            </div>
          </li>`).join("")}
        </ul>
      </section>
    `;

    document.getElementById("add-inbox").addEventListener("click", () => {
      const input = document.getElementById("quick-capture");
      const title = input.value.trim();
      if (!title) return notify("Digite algo para adicionar na Inbox.", "warn");
      state.tasks.push(createTask({ title, listType: LIST_TYPES.INBOX }));
      save();
      render();
    });

    app.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => {
      state.tasks = state.tasks.filter((t) => t.id !== btn.dataset.delete);
      save();
      render();
    }));

    app.querySelectorAll("[data-process]").forEach((btn) => btn.addEventListener("click", () => {
      const target = state.tasks.find((t) => t.id === btn.dataset.process);
      if (!target) return;
      const rest = state.tasks.filter((t) => t.id !== target.id);
      state.tasks = [target, ...rest];
      state.ui.activeTab = "process";
      save();
      render();
    }));
  }

  function renderProcess() {
    const item = state.tasks.find((t) => t.listType === LIST_TYPES.INBOX);
    if (!item) {
      app.innerHTML = `<section class="card"><h2>Processar</h2><p class="muted">Inbox vazia. Nada para processar agora.</p></section>`;
      return;
    }

    app.innerHTML = `
      <section class="card">
        <h2>Processar item</h2>
        <p><strong>${item.title}</strong></p>
        <label>Tipo
          <select id="proc-type">
            <option>Próxima ação</option>
            <option>Projeto</option>
            <option>Aguardando</option>
            <option>Talvez</option>
            <option>Referência</option>
            <option>Lixo</option>
          </select>
        </label>

        <div id="proc-fields"></div>
        <div class="row">
          <button id="save-next">Salvar e ir para próximo</button>
          <button id="go-back">Voltar</button>
        </div>
      </section>
    `;

    const typeEl = document.getElementById("proc-type");
    const fieldsEl = document.getElementById("proc-fields");

    const renderFields = () => {
      const projectOptions = `<option value="">Sem projeto</option>${state.projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}`;
      const commonContexts = ["@computador", "@telefone", "@campo", "@escritório", "@casa"];
      const type = typeEl.value;
      if (type === "Próxima ação") {
        fieldsEl.innerHTML = `
          <label>Título<input id="f-title" value="${item.title}" /></label>
          <label>Contexto
            <select id="f-context">${commonContexts.map((c) => `<option>${c}</option>`).join("")}</select>
          </label>
          <label>Prazo (opcional)<input id="f-due" type="date" /></label>
          <label>Projeto (opcional)<select id="f-project">${projectOptions}</select></label>
        `;
      } else if (type === "Aguardando") {
        fieldsEl.innerHTML = `
          <label>Título<input id="f-title" value="${item.title}" /></label>
          <label>Quem<input id="f-waiting" placeholder="Pessoa ou equipe" /></label>
          <label>Data de follow-up (opcional)<input id="f-follow" type="date" /></label>
        `;
      } else if (type === "Projeto") {
        fieldsEl.innerHTML = `
          <label>Nome do projeto<input id="f-pname" value="${item.title}" /></label>
          <label>Template
            <select id="f-template">${Object.values(PROJECT_TEMPLATES).map((t) => `<option value="${t.id}">${t.label}</option>`).join("")}</select>
          </label>
        `;
      } else {
        fieldsEl.innerHTML = `<p class="muted">Sem campos adicionais para este tipo.</p>`;
      }
    };

    typeEl.addEventListener("change", renderFields);
    renderFields();

    document.getElementById("go-back").addEventListener("click", () => setTab("inbox"));

    document.getElementById("save-next").addEventListener("click", () => {
      const type = typeEl.value;
      if (type === "Lixo") {
        state.tasks = state.tasks.filter((t) => t.id !== item.id);
      } else if (type === "Próxima ação") {
        const title = document.getElementById("f-title").value.trim();
        if (!title) return notify("Informe o título da próxima ação.", "warn");
        Object.assign(item, {
          title,
          listType: LIST_TYPES.NEXT,
          context: document.getElementById("f-context").value,
          dueDate: document.getElementById("f-due").value,
          projectId: document.getElementById("f-project").value,
          updatedAt: new Date().toISOString(),
        });
      } else if (type === "Aguardando") {
        const who = document.getElementById("f-waiting").value.trim();
        if (!who) return notify("Informe quem está aguardando.", "warn");
        Object.assign(item, {
          title: document.getElementById("f-title").value.trim() || item.title,
          listType: LIST_TYPES.WAITING,
          waitingOn: who,
          followUpDate: document.getElementById("f-follow").value,
          updatedAt: new Date().toISOString(),
        });
      } else if (type === "Projeto") {
        const name = document.getElementById("f-pname").value.trim();
        if (!name) return notify("Informe o nome do projeto.", "warn");
        const template = PROJECT_TEMPLATES[document.getElementById("f-template").value];
        const project = createProject({ name, status: PROJECT_STATUS.ACTIVE });
        const milestones = template.milestones.map((m) => createMilestone({ projectId: project.id, name: m }));
        if (!milestones.length) return notify("Projeto precisa de ao menos um marco.", "warn");
        state.projects.push(project);
        state.milestones.push(...milestones);
        state.tasks = state.tasks.filter((t) => t.id !== item.id);
      } else if (type === "Talvez") {
        item.listType = LIST_TYPES.SOMEDAY;
      } else if (type === "Referência") {
        item.listType = LIST_TYPES.REFERENCE;
      }

      save();
      render();
    });
  }

  function getNextMilestone(projectId) {
    const pending = state.milestones
      .filter((m) => m.projectId === projectId && m.status !== MILESTONE_STATUS.DONE)
      .sort((a, b) => sortByDate(a, b, "plannedDate"));
    return pending[0] || null;
  }

  function renderGtd() {
    const sub = state.ui.gtdSubtab || LIST_TYPES.NEXT;
    const list = state.tasks.filter((t) => t.listType === sub).sort((a, b) => sortByDate(a, b, "dueDate"));

    app.innerHTML = `
      <section class="card">
        <h2>GTD</h2>
        <div class="tabs">${GTD_SUBTABS.map((s) => `<button data-sub="${s.id}" class="tab ${sub === s.id ? "active" : ""}">${s.label}</button>`).join("")}</div>
        <div class="row filters">
          <input id="flt-text" placeholder="Filtro por texto" />
          <select id="flt-context"><option value="">Todos contextos</option><option>@computador</option><option>@telefone</option><option>@campo</option><option>@escritório</option><option>@casa</option></select>
          <select id="flt-project"><option value="">Todos projetos</option>${state.projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>
        </div>
        <ul id="gtd-list"></ul>
      </section>
    `;

    app.querySelectorAll("[data-sub]").forEach((btn) => btn.addEventListener("click", () => {
      state.ui.gtdSubtab = btn.dataset.sub;
      save();
      render();
    }));

    const updateList = () => {
      const txt = document.getElementById("flt-text").value.toLowerCase();
      const ctx = document.getElementById("flt-context").value;
      const project = document.getElementById("flt-project").value;
      const filtered = list.filter((t) =>
        (!txt || t.title.toLowerCase().includes(txt)) &&
        (!ctx || t.context === ctx) &&
        (!project || t.projectId === project)
      );
      document.getElementById("gtd-list").innerHTML = filtered.map((t) => `<li>
        <div>
          <strong>${t.title}</strong>
          <div class="muted">${t.context || "sem contexto"} ${t.dueDate ? `• ${t.dueDate}` : ""}</div>
        </div>
        <div class="actions">
          <button data-done="${t.id}">Concluir</button>
          <button data-edit="${t.id}">Editar</button>
          <button data-del="${t.id}" class="danger">Excluir</button>
        </div>
      </li>`).join("");

      app.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", () => {
        const task = state.tasks.find((t) => t.id === b.dataset.done);
        if (!task) return;
        task.listType = LIST_TYPES.DONE;
        task.status = "concluída";
        save();
        render();
      }));

      app.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
        state.tasks = state.tasks.filter((t) => t.id !== b.dataset.del);
        save();
        render();
      }));

      app.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
        const task = state.tasks.find((t) => t.id === b.dataset.edit);
        if (!task) return;
        const title = prompt("Editar título", task.title);
        if (title === null) return;
        task.title = title.trim() || task.title;
        save();
        render();
      }));
    };

    ["flt-text", "flt-context", "flt-project"].forEach((id) => document.getElementById(id).addEventListener("input", updateList));
    document.getElementById("flt-context").addEventListener("change", updateList);
    document.getElementById("flt-project").addEventListener("change", updateList);
    updateList();
  }

  function renderProjectDetail(projectId) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return renderProjects();

    const milestones = state.milestones
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => sortByDate(a, b, "plannedDate"));

    app.innerHTML = `
      <section class="card">
        <button id="back-projects">← Voltar</button>
        <h2>Projeto</h2>
        <label>Nome<input id="p-name" value="${project.name}" /></label>
        <label>Cliente (opcional)<input id="p-client" value="${project.client || ""}" /></label>
        <label>Descrição (opcional)<textarea id="p-desc">${project.description || ""}</textarea></label>
        <label>Status
          <select id="p-status">
            ${Object.values(PROJECT_STATUS).map((s) => `<option ${project.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </label>
        <button id="save-project">Salvar projeto</button>
      </section>

      <section class="card">
        <h3>Marcos</h3>
        <button id="add-ms">Adicionar marco</button>
        <ul>
          ${milestones.map((m) => `
            <li>
              <div>
                <strong>${m.name}</strong> <span class="muted">${m.plannedDate || "sem data"} • ${m.status}</span>
                <div class="muted">${m.notes || ""}</div>
                <ul>
                ${(m.checklist || []).map((c) => `<li>
                  <label><input type="checkbox" data-check="${m.id}:${c.id}" ${c.done ? "checked" : ""}/> ${c.text}</label>
                  <button data-rm-check="${m.id}:${c.id}" class="danger">x</button>
                </li>`).join("")}
                </ul>
              </div>
              <div class="actions">
                <button data-ms-done="${m.id}">Concluir marco</button>
                <button data-ms-edit="${m.id}">Editar</button>
                <button data-ms-add-check="${m.id}">Adicionar checklist</button>
              </div>
            </li>`).join("")}
        </ul>
      </section>
    `;

    document.getElementById("back-projects").addEventListener("click", () => {
      state.ui.selectedProjectId = "";
      save();
      render();
    });

    document.getElementById("save-project").addEventListener("click", () => {
      project.name = document.getElementById("p-name").value.trim();
      project.client = document.getElementById("p-client").value.trim();
      project.description = document.getElementById("p-desc").value.trim();
      project.status = document.getElementById("p-status").value;
      project.updatedAt = new Date().toISOString();
      save();
      notify("Projeto salvo.");
      render();
    });

    document.getElementById("add-ms").addEventListener("click", () => {
      const name = prompt("Nome do marco");
      if (!name?.trim()) return;
      state.milestones.push(createMilestone({ projectId, name: name.trim() }));
      save();
      render();
    });

    app.querySelectorAll("[data-ms-done]").forEach((b) => b.addEventListener("click", () => {
      const ms = state.milestones.find((m) => m.id === b.dataset.msDone);
      if (!ms) return;
      ms.status = MILESTONE_STATUS.DONE;
      save();
      render();
    }));

    app.querySelectorAll("[data-ms-edit]").forEach((b) => b.addEventListener("click", () => {
      const ms = state.milestones.find((m) => m.id === b.dataset.msEdit);
      if (!ms) return;
      const name = prompt("Nome do marco", ms.name);
      if (name === null) return;
      const plannedDate = prompt("Data planejada (YYYY-MM-DD, opcional)", ms.plannedDate || "");
      if (plannedDate === null) return;
      const notes = prompt("Notas/links", ms.notes || "");
      if (notes === null) return;
      ms.name = name.trim() || ms.name;
      ms.plannedDate = plannedDate;
      ms.notes = notes;
      save();
      render();
    }));

    app.querySelectorAll("[data-ms-add-check]").forEach((b) => b.addEventListener("click", () => {
      const ms = state.milestones.find((m) => m.id === b.dataset.msAddCheck);
      if (!ms) return;
      const text = prompt("Texto do item da checklist");
      if (!text?.trim()) return;
      ms.checklist.push(createChecklistItem(text));
      save();
      render();
    }));

    app.querySelectorAll("[data-rm-check]").forEach((b) => b.addEventListener("click", () => {
      const [msId, itemId] = b.dataset.rmCheck.split(":");
      const ms = state.milestones.find((m) => m.id === msId);
      if (!ms) return;
      ms.checklist = ms.checklist.filter((c) => c.id !== itemId);
      save();
      render();
    }));

    app.querySelectorAll("[data-check]").forEach((ch) => ch.addEventListener("change", () => {
      const [msId, itemId] = ch.dataset.check.split(":");
      const ms = state.milestones.find((m) => m.id === msId);
      const item = ms?.checklist.find((c) => c.id === itemId);
      if (!item) return;
      item.done = ch.checked;
      save();
    }));
  }

  function renderProjects() {
    if (state.ui.selectedProjectId) return renderProjectDetail(state.ui.selectedProjectId);

    app.innerHTML = `
      <section class="card">
        <h2>Projetos</h2>
        <p class="muted">Cada projeto precisa ter ao menos 1 marco.</p>
        <button id="new-project">Novo projeto</button>
        <ul>
          ${state.projects.map((p) => {
            const next = p.status === PROJECT_STATUS.ACTIVE ? getNextMilestone(p.id) : null;
            return `<li>
              <div>
                <strong>${p.name}</strong>
                <div class="muted">${p.status} • Próximo marco: ${next ? `${next.name} (${next.plannedDate || "sem data"})` : "—"}</div>
              </div>
              <div class="actions">
                <button data-open-project="${p.id}">Abrir</button>
              </div>
            </li>`;
          }).join("")}
        </ul>
      </section>
    `;

    document.getElementById("new-project").addEventListener("click", () => {
      const name = prompt("Nome do projeto");
      if (!name?.trim()) return notify("Nome do projeto é obrigatório.", "warn");
      const templateKey = prompt("Template: consultoria ou simples", "simples");
      const template = PROJECT_TEMPLATES[templateKey] || PROJECT_TEMPLATES.simples;
      const project = createProject({ name });
      const milestones = template.milestones.map((m) => createMilestone({ projectId: project.id, name: m }));
      if (!milestones.length) return notify("Projeto precisa de ao menos um marco.", "warn");
      state.projects.push(project);
      state.milestones.push(...milestones);
      save();
      render();
    });

    app.querySelectorAll("[data-open-project]").forEach((b) => b.addEventListener("click", () => {
      state.ui.selectedProjectId = b.dataset.openProject;
      save();
      render();
    }));
  }

  function renderBackup() {
    app.innerHTML = `
      <section class="card">
        <h2>Backup</h2>
        <div class="row">
          <button id="export-json">Exportar JSON</button>
          <input id="import-json" type="file" accept="application/json" />
          <button id="reset-local" class="danger">Reset local</button>
        </div>
      </section>
    `;

    document.getElementById("export-json").addEventListener("click", () => {
      const blob = new Blob([exportJson()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gtd-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById("import-json").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ok = confirm("Importar backup vai substituir os dados atuais. Continuar?");
      if (!ok) return;
      try {
        const text = await file.text();
        importJson(text);
        notify("Backup importado com sucesso.");
        render();
      } catch (err) {
        notify(err.message || "Falha ao importar backup.", "warn");
      }
    });

    document.getElementById("reset-local").addEventListener("click", () => {
      const ok = confirm("Tem certeza que deseja limpar tudo do navegador?");
      if (!ok) return;
      resetAll();
      notify("Dados locais removidos.");
      render();
    });
  }

  function render() {
    renderTabs();
    const tab = state.ui.activeTab;
    if (tab === "agenda") renderAgenda();
    if (tab === "inbox") renderInbox();
    if (tab === "process") renderProcess();
    if (tab === "gtd") renderGtd();
    if (tab === "projects") renderProjects();
    if (tab === "backup") renderBackup();
  }

  return { render, notify, setState };
}
