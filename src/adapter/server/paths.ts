import { homedir } from "node:os";
import path from "node:path";

// 設定檔的落點。
//
// ⚠️ JR_CLAUDE_DIR 存在的理由不是彈性，是安全：這些動作會**寫進使用者真正的
// Claude Code 設定**。開發與測試時把它指到暫存目錄，才不會把自己的 settings.json
// 改掉——而那種事出錯時是安靜的，等你發現已經是幾天後。
export function claudeDir(): string {
  return process.env.JR_CLAUDE_DIR ?? path.join(homedir(), ".claude");
}

export function settingsPath(): string {
  return path.join(claudeDir(), "settings.json");
}

export function hookPath(): string {
  return path.join(claudeDir(), "hooks", "block-chained-bash.js");
}
