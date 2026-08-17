import { isLocale, type Locale } from "../../copy/index.ts";
import { K, type MessageKey } from "../../domain/copy-keys.ts";
import { findCapabilities } from "../../usecase/describe-progress.ts";
import { api, ApiError, type ServerEvent, type StateBody } from "./api.ts";
import { CARD_PARAM, resolveCardIndex } from "./viewmodel/card-route.ts";
import {
  matchesPasteProof,
  type AppState,
  type TerminalEntry,
} from "./viewmodel/card-model.ts";

// 唯一可變狀態。畫面完全由它推導——沒有任何「記得按順序呼叫重畫」的規則，
// 那類時序 bug 在這個結構下寫不出來（前一代最大的一類）。
export interface Store {
  get(): AppState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  runAction(action: string, checkId?: string, startKey?: MessageKey): Promise<void>;
  openTerminal(action: string): Promise<void>;
  cancel(): Promise<void>;
  sendInput(text: string): Promise<void>;
  toggleEye(id: string, checked: boolean): Promise<void>;
  submitProof(id: string, text: string): Promise<void>;
  loadWalkthrough(id: string): Promise<unknown>;
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

// 網址列的讀與寫。兩邊都容忍「這個環境沒有 location／history」——測試跑在 Node 裡，
// 而這兩件事都只是體驗，不該讓 store 本身載不起來。
function cardParamFromUrl(): string | null {
  const search = globalThis.location?.search;
  return search === undefined ? null : new URLSearchParams(search).get(CARD_PARAM);
}

// ⚠️ 用 replaceState 不用 pushState：每換一張就塞一筆歷史的話，學生按上一頁只會
// 一張一張倒退回去，而他想回的通常是嚮導之外的那個頁面。
function writeCardToUrl(id: string): void {
  const href = globalThis.location?.href;

  if (href === undefined || globalThis.history === undefined) {
    return;
  }

  const url = new URL(href);
  url.searchParams.set(CARD_PARAM, id);
  globalThis.history.replaceState(null, "", url);
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
    proofValues: {},
    terminal: [],
    runningAction: null,
    runningRunId: null,
    runningAcceptsInput: false,
  };
  const listeners = new Set<() => void>();
  // 第幾輪。原始輸出保留最近幾輪要靠它分組（見 viewmodel 的 recentRawOutput）。
  let runSeq = 0;

  const set = (next: Partial<AppState>): void => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  const applyBody = (body: StateBody): void => {
    set({ cards: body.cards, platform: body.platform });
  };

  // store 只記「發生了什麼」，不記顏色也不記翻好的字——兩者都是呈現決定。
  const push = (entry: TerminalEntry): void => {
    set({ terminal: [...state.terminal, entry] });
  };

  api.stream((event: ServerEvent) => {
    if (event.type === "state") {
      set({ cards: event.cards });
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
    set({ runningAction: null, runningRunId: null, runningAcceptsInput: false });
  });

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async load() {
      applyBody(await api.state());
      // 網址指定哪一張就從哪一張開始。驗收時要重跑第 N 張卡，不然得從第一張
      // 一路按「下一張」按過去。
      const index = resolveCardIndex(state.cards, cardParamFromUrl());
      const card = state.cards[index];

      if (card !== undefined) {
        set({ activeIndex: index });
        writeCardToUrl(card.id);
        applyBody(await api.visit(card.id));
      }
    },

    // ⚠️ 每一條路都要接住錯誤。
    //
    // 伺服器擋下這次動作（例如「還沒裝完就想驗」）時 fetch 是正常回應、api 那層
    // 把它變成 throw——沒人接的話畫面一個字都不會變，而且 runningAction 停在按下去
    // 的那一刻永遠不清，之後每顆按鈕都是灰的。學生看到的是「按了沒反應，然後整張
    // 卡死掉」，實際上伺服器早就回答他了。
    async runAction(action, checkId, startKey) {
      try {
        await perform(action, checkId, startKey);
      } catch (error) {
        reportFailure(error);
      }
    },

    // 開工作視窗不代表開始一輪執行：請求一回來學生仍要在那個視窗裡操作，所以這裡
    // 不設 runningAction，也不等待 run-done。
    async openTerminal(action) {
      try {
        await api.openTerminal(action);
      } catch (error) {
        reportFailure(error);
      }
    },

    // 取消只送一個請求，不自己動狀態——伺服器停下來之後照樣發 run-done，畫面走的
    // 是跟正常結束一模一樣那條路。自己搶著清的話，兩邊會各清一次而順序不保證。
    async cancel() {
      const runId = state.runningRunId;

      if (runId === null) {
        return;
      }

      try {
        await api.cancel(runId);
      } catch (error) {
        reportFailure(error);
      }
    },

    // 學生貼進來的授權碼，原封不動送進那個子行程的 stdin。
    //
    // 送出去的那一行也印在終端區：剪貼簿看不見，不回顯的話學生不知道自己貼的是
    // 什麼、有沒有送出去。
    async sendInput(text) {
      const runId = state.runningRunId;

      if (runId === null || text === "") {
        return;
      }

      try {
        await api.input(runId, text);
        push({ source: "output", text: `> ${text}`, kind: "output", run: runSeq });
      } catch (error) {
        reportFailure(error);
      }
    },

    async toggleEye(id, checked) {
      await api.eyeCheck(id, checked);
    },

    async submitProof(id, text) {
      set({ proofValues: { ...state.proofValues, [id]: text } });
      const proof = state.cards
        .flatMap((card) => findCapabilities(card.capabilities, "paste-proof"))
        .find((capability) => capability.id === id);

      await api.eyeCheck(id, matchesPasteProof(text, proof!.expected));
    },

    loadWalkthrough(id) {
      return api.walkthrough(state.locale, id);
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
      writeCardToUrl(next.id);
      applyBody(await api.visit(next.id));
    },

    // 切語言就只是換一次 state。畫面照原本那條路重新推導，終端裡已經印出來的
    // 那幾行也會跟著翻——因為 store 存的是代號不是字。
    setLocale(locale) {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      set({ locale });
    },
  };

  async function perform(
    action: string,
    checkId?: string,
    startKey?: MessageKey,
  ): Promise<void> {
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
    //
    // 驗證的把手就是那一格的 id（伺服器用同一個字當 runId），所以取消鈕在請求還沒
    // 回來之前就已經指得到人。
    if (checkId !== undefined) {
      set({ runningRunId: checkId });
      await api.verify(checkId);
      return;
    }

    const { runId, acceptsInput } = await api.run(action);
    set({ runningRunId: runId, runningAcceptsInput: acceptsInput });
  }

  // 失敗的收尾只有兩件事：講出來，然後把按鈕還給學生。
  //
  // 伺服器講得出代號的（他自己修得掉的狀況）翻成他的語言印在白話那一區；講不出
  // 代號的是我們的 bug，原文丟進原始輸出，我要的是那句原文不是被美化過的版本。
  function reportFailure(error: unknown): void {
    const messageKey = error instanceof ApiError ? error.messageKey : null;

    if (messageKey !== null) {
      push({ source: "notice", messageKey, kind: "done-fail" });
    } else {
      push({
        source: "output",
        text: error instanceof Error ? error.message : String(error),
        kind: "error",
        run: runSeq,
      });
      push({ source: "notice", messageKey: K.run.failed, kind: "done-fail" });
    }

    set({ runningAction: null, runningRunId: null, runningAcceptsInput: false });
  }
}
