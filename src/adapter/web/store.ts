import { isLocale, type Locale } from "../../copy/index.ts";
import { K, type MessageKey } from "../../domain/copy-keys.ts";
import type { ProgressState } from "../../domain/progress.ts";
import { api, type ServerEvent, type StateBody, type WireProgress } from "./api.ts";
import type { AppState, TerminalEntry } from "./viewmodel/card-model.ts";

// 唯一可變狀態。畫面完全由它推導——沒有任何「記得按順序呼叫重畫」的規則，
// 那類時序 bug 在這個結構下寫不出來（前一代最大的一類）。
export interface Store {
  get(): AppState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  runAction(action: string, checkId?: string, startKey?: MessageKey): Promise<void>;
  toggleEye(id: string, checked: boolean): Promise<void>;
  skip(): Promise<void>;
  goNext(): Promise<void>;
  setLocale(locale: Locale): void;
}

const LOCALE_STORAGE_KEY = "jr.locale";

// 記住學生選的語言。不記的話每次重整都跳回繁體——嚮導會被重整很多次（裝完東西、
// 開新終端回來），每次都要重選等於這顆按鈕沒用。
function loadLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(saved) ? saved : "zh-TW";
}

export function createStore(): Store {
  let state: AppState = {
    cards: [],
    // 現在停在哪一張。卡片走完一張換下一張——推導出來的話（「第一張沒完成的」）
    // 學生按一下按鈕就會被丟回前面某張，前一代實測踩過。
    activeIndex: 0,
    locale: loadLocale(),
    // 伺服器回報之前先當「其他」——寧可多顯示一條共通的，也不要錯把 mac 的
    // 步驟給 Windows 的學生看。
    platform: "other",
    progress: emptyProgress(),
    terminal: [],
    runningAction: null,
  };
  const listeners = new Set<() => void>();
  // 第幾輪。原始輸出保留最近幾輪要靠它分組（見 viewmodel 的 recentRawOutput）。
  let runSeq = 0;

  const set = (next: Partial<AppState>): void => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  const applyBody = (body: StateBody): void => {
    set({ cards: body.cards, platform: body.platform, progress: hydrate(body.progress) });
  };

  // store 只記「發生了什麼」，不記顏色也不記翻好的字——兩者都是呈現決定。
  const push = (entry: TerminalEntry): void => {
    set({ terminal: [...state.terminal, entry] });
  };

  api.stream((event: ServerEvent) => {
    if (event.type === "state") {
      set({ progress: hydrate(event.progress) });
      return;
    }

    // 指令吐出來的原文照原樣留著——那是真實輸出，翻譯它反而看不出機器說了什麼。
    if (event.type === "run-line") {
      if (event.event.kind === "exit") return;
      push({
        source: "output",
        text: event.event.text,
        kind: event.event.kind === "error" ? "error" : "output",
        run: runSeq,
      });
      return;
    }

    if (event.type === "notice") {
      push({
        source: "notice",
        messageKey: event.messageKey,
        kind: event.failed ? "error" : "note",
      });
      return;
    }

    push({
      source: "notice",
      messageKey: event.success ? K.run.done : K.run.failed,
      kind: event.success ? "done-ok" : "done-fail",
    });
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
      const first = state.cards[0];

      if (first !== undefined) {
        applyBody(await api.visit(first.id));
      }
    },

    async runAction(action, checkId, startKey) {
      if (action === "recheck") {
        push({ source: "notice", messageKey: K.run.rechecking, kind: "note" });
        applyBody(await api.recheck());
        push({ source: "notice", messageKey: K.run.recheckDone, kind: "note" });
        return;
      }

      // ⚠️ 不清白話那幾行：跑一輪只換掉原始輸出。連白話一起清的話，剛印的那句
      // 「正在安裝…」會被自己的執行清掉，翻回這張卡也看不到當時的紀錄。
      runSeq += 1;
      set({ runningAction: action });

      if (startKey !== undefined) {
        push({ source: "notice", messageKey: startKey, kind: "note" });
      }

      // 驗證要指名是哪一格。ViewModel 已經把 checkId 綁在那顆按鈕上——沒有它就是
      // 前一代那個「按第二格卻開了第一格的終端」的坑。
      if (checkId !== undefined) {
        await api.verify(checkId);
        return;
      }

      await api.run(action);
    },

    async toggleEye(id, checked) {
      await api.eyeCheck(id, checked);
    },

    async skip() {
      const card = state.cards[state.activeIndex];

      if (card !== undefined) {
        applyBody(await api.skip(card.id));
      }
    },

    async goNext() {
      const next = state.cards[state.activeIndex + 1];

      if (next === undefined) {
        return;
      }

      // 換卡先清終端：那幾行講的是上一張的事，留著只會讓學生以為現在這張跑過了。
      set({ activeIndex: state.activeIndex + 1, terminal: [] });
      applyBody(await api.visit(next.id));
    },

    // 切語言就只是換一次 state。畫面照原本那條路重新推導，終端裡已經印出來的
    // 那幾行也會跟著翻——因為 store 存的是代號不是字。
    setLocale(locale) {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      set({ locale });
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
