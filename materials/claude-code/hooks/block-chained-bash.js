#!/usr/bin/env node
// PreToolUse hook: 一次只跑一個指令。
// 偵測 Bash 指令裡的串接運算子 && / || / ;（先去掉引號內字串避免誤判），
// 命中就 exit 2 擋下，並把訊息回給 Claude，要它拆成多次 Bash 呼叫。
// 單一 pipe | 允許（grep|head 這種一條資料流的單一操作）。
//
// ⚠️ 這支 hook 的失敗方式是**靜默放行**：exit 0 就是「沒事，跑吧」。所以每一條提早
// 結束的路都要問一次「這條會不會在該擋的時候放行」——Windows VM 上就這樣被放行過
// （#30）。BOM 與工具名兩個出口都是那樣來的。
let raw = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let data;

  try {
    // ⚠️ 先剝掉 BOM 再 parse。Windows 上有東西會在 UTF-8 前面加 ﻿（PowerShell 用
    // 管線餵原生 exe 就會），而 JSON.parse 看到它直接丟例外 → 走下面那個 catch →
    // 靜默放行。學生看到的是「hook 裝好了就是不擋」。
    data = JSON.parse(raw.replace(/^﻿/, ""));
  } catch {
    process.exit(0); // 讀不到就放行，不擋別的工具
  }

  // ⚠️ 這裡**不再**檢查 tool_name。
  //
  // 該由誰管這個範圍，settings.json 的 matcher 已經決定了；在這裡照著字面再比一次
  // 「是不是叫 Bash」，只是多一個出錯的地方——而那個工具在 Windows 上叫什麼，我們
  // 沒有驗過（#30）。判準改成「這次呼叫帶不帶指令字串」：不帶的就不是我們要管的。
  const cmd = data?.tool_input?.command;

  if (typeof cmd !== "string") {
    process.exit(0);
  }

  // 去掉單/雙引號內的內容，這樣 echo "a;b" 不會誤觸
  const stripped = cmd.replace(/"[^"]*"|'[^']*'/g, "");

  if (/&&|\|\||;/.test(stripped)) {
    // ⚠️ 不要寫「拆成多次 Bash 呼叫」。Windows 上 Claude Code 有兩個跑指令的工具
    // （Bash 與 PowerShell），走哪一條是模型當下自己選的——指名 Bash 會讓走 PowerShell
    // 的學生看到一句對不上自己畫面的話。第一句是判定用的關鍵字，不要動。
    const reason =
      "一次只跑一個指令：偵測到 && / || / ; 串接。\n" +
      "請拆成多次呼叫，一次一條——這樣白名單才命中，也看得清每一步。\n" +
      "（單一 pipe | 可以；需要切目錄請用絕對路徑，別用 `cd x && 指令`。）";

    // ⚠️ 用 JSON 明講「拒絕」，**不要**靠 exit 2。
    //
    // 「exit 2 等於擋下」是把決定藏在結束碼這個副作用裡，而副作用會被中間層改寫：
    // Windows 上 hook 是透過 shell 叫起來的，node 回的 2 沒有原封不動傳到 Claude Code，
    // 於是落進「其他結束碼＝只顯示給使用者，但繼續執行」那一類。實測畫面是
    // 「PreToolUse:PowerShell hook error / Failed with non-blocking status code: <我們的訊息>」
    // ——訊息到了、指令照跑（#38）。
    //
    // 決定寫在內容裡就沒有這個問題。stderr 那份留著是給人手動測時看的。
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      })}\n`,
    );
    process.stderr.write(reason);
    process.exit(0);
  }

  process.exit(0);
});
