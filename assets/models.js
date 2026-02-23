export const LIST_TYPES = {
  INBOX: "inbox",
  NEXT: "next",
  WAITING: "waiting",
  SOMEDAY: "someday",
  REFERENCE: "reference",
  DONE: "done",
};

export const PROJECT_STATUS = {
  ACTIVE: "Ativo",
  DONE: "Concluído",
  HOLD: "Em espera",
};

export const MILESTONE_STATUS = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
};

export const PROJECT_TEMPLATES = {
  consultoria: {
    id: "consultoria",
    label: "Consultoria com visitas",
    milestones: [
      "Kick-off",
      "Visita 1",
      "Visita 2",
      "Atividades de escritório / Estudo",
      "Visita final / Apresentação",
      "Entrega do relatório",
    ],
  },
  simples: {
    id: "simples",
    label: "Projeto simples",
    milestones: ["Planejamento", "Execução", "Entrega"],
  },
};

export function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createTask(data = {}) {
  const now = nowIso();
  return {
    id: createId(),
    title: data.title?.trim() || "",
    status: data.status || "aberta",
    listType: data.listType || LIST_TYPES.INBOX,
    context: data.context || "",
    dueDate: data.dueDate || "",
    projectId: data.projectId || "",
    createdAt: now,
    updatedAt: now,
    waitingOn: data.waitingOn || "",
    followUpDate: data.followUpDate || "",
    notes: data.notes || "",
  };
}

export function createProject(data = {}) {
  const now = nowIso();
  return {
    id: createId(),
    name: data.name?.trim() || "",
    client: data.client || "",
    description: data.description || "",
    status: data.status || PROJECT_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMilestone(data = {}) {
  return {
    id: createId(),
    projectId: data.projectId || "",
    name: data.name?.trim() || "",
    plannedDate: data.plannedDate || "",
    status: data.status || MILESTONE_STATUS.NOT_STARTED,
    checklist: Array.isArray(data.checklist) ? data.checklist : [],
    notes: data.notes || "",
  };
}

export function createChecklistItem(text = "") {
  return {
    id: createId(),
    text: text.trim(),
    done: false,
  };
}
