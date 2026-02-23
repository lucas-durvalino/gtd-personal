const STORAGE_KEY = "gtd-personal-v1";

function normalizeMilestone(milestone) {
  return {
    ...milestone,
    plannedDate: milestone.plannedDate || null,
    completedDate: milestone.completedDate || null,
    checklist: Array.isArray(milestone.checklist) ? milestone.checklist : [],
  };
}

function defaultState() {
  return {
    tasks: [],
    projects: [],
    milestones: [],
    ui: { activeTab: "agenda", gtdSubtab: "next", selectedProjectId: "" },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones.map(normalizeMilestone) : [],
      ui: { ...defaultState().ui, ...(parsed.ui || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportBackup(state) {
  return JSON.stringify(state, null, 2);
}

export function importBackup(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Formato inválido de backup.");
  }
  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.milestones)) {
    throw new Error("Backup inválido: faltam coleções obrigatórias.");
  }
  return {
    tasks: parsed.tasks,
    projects: parsed.projects,
    milestones: parsed.milestones.map(normalizeMilestone),
    ui: { activeTab: "agenda", gtdSubtab: "next", selectedProjectId: "" },
  };
}

export function resetStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
