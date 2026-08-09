import type { ProgressState } from "../../domain/progress.ts";
import { api, type ServerEvent, type StateBody, type WireProgress } from "./api.ts";
import type { AppState, TerminalEntry } from "./viewmodel/card-model.ts";

// 唯一可變狀態。畫面完全由它推導——沒有任何「記得按順序呼叫重畫」的規則，
// 那類時序 bug 在這個結構下寫不出來（前一代最大的一類）。
export interface Store {
  get(): AppState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  runAction(action: string): Promise<void>;
  toggleEye(id: string, checked: boolean): Promise<void>;
  skip(): Promise<void>;
}

export function createStore(): Store {
  let state: AppState = {
    card: { id: "", sectionId: "", label: "載入中…", checkIds: [], capabilities: [] },
    labels: {},
    progress: emptyProgress(),
    terminal: [],
    runningAction: null,
  };
  const listeners = new Set<() => void>();

  const set = (next: Partial<AppState>): void => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  const applyBody = (body: StateBody): void => {
    set({ card: body.card, labels: body.labels, progress: hydrate(body.progress) });
  };

  // store 只記「發生了什麼」，不記顏色——顏色是呈現決定，留給 ViewModel。
  const say = (text: string, kind: TerminalEntry["kind"]): void => {
    set({ terminal: [...state.terminal, { text, kind }] });
  };

  api.stream((event: ServerEvent) => {
    if (event.type === "state") {
      set({ progress: hydrate(event.progress) });
      return;
    }

    if (event.type === "run-line") {
      if (event.event.kind === "exit") return;
      say(event.event.text, event.event.kind === "error" ? "error" : "output");
      return;
    }

    say(event.success ? "完成" : "沒有成功", event.success ? "done-ok" : "done-fail");
    set({ runningAction: null });
  });

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async load() {
      applyBody(await api.state());
      applyBody(await api.visit());
    },

    async runAction(action) {
      if (action === "recheck") {
        say("重新檢查環境狀態…", "note");
        applyBody(await api.recheck());
        say("檢查完成，狀態已更新。", "note");
        return;
      }

      set({ runningAction: action, terminal: [] });

      if (action === "verify-claude") {
        await api.verify();
        return;
      }

      await api.run(action);
    },

    async toggleEye(id, checked) {
      await api.eyeCheck(id, checked);
    },

    async skip() {
      applyBody(await api.skip());
    },
  };
}

function hydrate(wire: WireProgress): ProgressState {
  return {
    statuses: new Map(wire.statuses),
    verified: new Set(wire.verified),
    attempted: new Set(wire.attempted),
    eyeChecked: new Set(wire.eyeChecked),
    visited: new Set(wire.visited),
    skipped: new Set(wire.skipped),
  };
}

function emptyProgress(): ProgressState {
  return {
    statuses: new Map(),
    verified: new Set(),
    attempted: new Set(),
    eyeChecked: new Set(),
    visited: new Set(),
    skipped: new Set(),
  };
}
