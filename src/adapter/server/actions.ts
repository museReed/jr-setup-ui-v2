import { resolveInstaller } from "./installers.ts";

// 一個 action 要跑什麼。集中在這裡是為了讓 controller 只認名字、不認指令——
// 網頁送過來的字串永遠只能命中這張表裡的一筆，命不中就是 400。
export interface ActionSpec {
  readonly label: string;
  readonly cmd: string;
  readonly args: readonly string[];
  // 這條路要不要留著 stdin。登入會問你貼授權碼，關掉 stdin 就沒得答。
  readonly acceptsInput: boolean;
  readonly env: Readonly<Record<string, string>>;
}

// claude 登入會自己開瀏覽器。課堂上那一下會蓋掉嚮導頁面，學生找不到回來的路，
// 所以擋掉自動開啟、改讓他自己點畫面上的連結。
const NO_AUTO_BROWSER = { BROWSER: "echo" } as const;

// 安裝走各家官方的原生安裝器，不經過 npm（理由見 installers.ts 開頭）。
// 這台機器沒有對應的安裝器時，這個動作就不存在——按下去才失敗比按不下去難查。
const claudeInstaller = resolveInstaller("claude", process.platform);

export const ACTIONS: Readonly<Record<string, ActionSpec>> = {
  ...(claudeInstaller === undefined
    ? {}
    : {
        "install-claude": {
          label: "安裝 Claude Code",
          cmd: claudeInstaller.cmd,
          args: claudeInstaller.args,
          acceptsInput: false,
          env: claudeInstaller.env,
        },
      }),
  "login-claude": {
    label: "登入 Claude Code",
    cmd: "claude",
    args: ["auth", "login"],
    acceptsInput: true,
    env: NO_AUTO_BROWSER,
  },
};

// 開真終端視窗那條路不共用上面那張表：它跑的不是一條指令，而是一支我們寫出去的
// 腳本（見 terminal-opener.ts）。這裡只留「這個 action 認不認得」。
export const TERMINAL_ACTIONS = new Set(["verify-claude", "verify-allowlist"]);

export function findAction(action: string): ActionSpec | undefined {
  return Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined;
}
