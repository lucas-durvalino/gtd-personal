import { loadState, saveState, exportBackup, importBackup, resetStorage } from "./storage.js";
import { createUI } from "./ui.js";

let state = loadState();

function save() {
  saveState(state);
}

const ui = createUI({
  state,
  setState(next) {
    state = next;
    save();
  },
  save,
  exportJson: () => exportBackup(state),
  importJson: (raw) => {
    state = importBackup(raw);
    save();
  },
  resetAll: () => {
    resetStorage();
    state = loadState();
    save();
  },
});

ui.render();
