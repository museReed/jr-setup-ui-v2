import type { MessageKey } from "../domain/copy-keys.ts";

export const zhCN: Record<MessageKey, string> = {
  "card.claude": "Claude Code",
  "check.claude": "Claude Code CLI",
  "check.claude-auth": "Claude Code 登录状态",
  "check.codex": "Codex CLI",
  "check.codex-auth": "Codex 登录状态",

  "check.hook": "一次只跑一个指令",
  "check.allowlist": "常用指令不用每次问你",

  "manual-step.fullscreen-open-title": "第一步：打开一个窗口，把这两件做完",
  "manual-step.fullscreen-open-button": "打开 Claude Code",
  "eye.fullscreen-yes": "弹出方框时按 1. Yes, try it",
  "eye.fullscreen-yes-detail": "画面会整个重画一次，方框消失",
  "eye.fullscreen-mouse": "输入一句话，用鼠标点那句话中间",
  "eye.fullscreen-mouse-detail":
    "就在刚才那个窗口里；光标会跳到你点的位置，不用按左右键移过去",
  "manual-step.fullscreen-proof-title": "第二步：再打开一个，圈选代码贴回来",
  "manual-step.fullscreen-proof-button": "打开并送出测试句",
  "eye.fullscreen-copy": "圈选代码那一行，贴进下面的输入框",
  "eye.fullscreen-copy-detail":
    "松开鼠标就复制好了，不要按 Ctrl+C——在这个模式下它是中断执行",

  "badge.untouched": "还没开始",
  "badge.visited-incomplete": "进行中",
  "badge.complete": "已完成",
  "badge.failed": "验证没过",

  "status.missing": "还没安装",
  "status.not-logged-in": "还没登录",
  "status.unverified": "装好了，还没验过真的生效",
  "status.ok": "验过生效",
  "status.failed": "验过，但没通过",

  "action.install": "安装",
  "action.reinstall": "重新安装",
  "action.login": "登录",
  "action.relogin": "重新登录",
  "action.verify-terminal": "开终端验证",
  "action.verify-auto": "验证",
  "action.rerun-verify": "重跑验证",
  "action.recheck": "再 check 一次",
  "action.cancel": "取消这一轮",
  "action.submit-code": "送出",
  "action.open-link": "打开登录页面",
  "action.open-codex-link": "浏览器没打开？点这里打开 OpenAI 授权页面",

  "card.codex": "Codex CLI",
  "card.guardrails": "它什么时候该停下来问你",
  "card.checklist-title": "这张卡要完成的事",
  "card.advance-done": "这张做完了",
  "card.advance-loose": "可以往下一张，但这张还没完成",
  "card.advance-blocked": "上面几格做完才能往下一张",
  "card.next": "下一张",
  "card.skip": "先跳过这张",
  "card.help": "怎么做",

  "hint.manual-only": "这一格程式看不到，只有你看得到",


  "terminal.title": "现在正在做什么",
  "terminal.empty": "按上面的按钮，这里会即时显示进度。",

  "mock.unknown": "认不得的画面类型：",
  "mock.which-button": "（哪颗按钮）",
  "mock.which-row": "（哪一列）",
  "mock.which-step": "（哪一步）",
  "mock.which-step-item": "（那一步底下的项目）",
  "mock.which-title": "（标题）",
  "mock.terminal-app": "终端",

  "terminal.raw-summary": "看原始输出",
  "terminal.raw-empty": "还没有任何指令跑过。",
  "terminal.copy": "复制",
  "terminal.copied": "已复制",

  "walkthrough.title": "怎么做",
  "walkthrough.close": "关闭",
  "walkthrough.see": "会看到",
  "walkthrough.warn": "别做",
  "walkthrough.miss": "没发生的话",

  "run.rechecking": "重新检查环境状态…",
  "run.recheck-done": "检查完成，状态已更新。",
  "run.done": "完成",
  "run.failed": "没有成功",
  "run.start-install-claude": "正在安装 Claude Code。这一步要下载，可能要一两分钟。",
  "run.start-login-claude": "正在开始登录。等一下会出现一段网址与代码，照着做完再回来。",
  "run.start-install-codex": "正在安装 Codex CLI。这一步要下载，可能要一两分钟。",
  "run.start-login-codex":
    "正在开始登录 Codex。浏览器会自动打开；如果没有，再点画面上的备用链接。",
  "run.start-install-hook": "正在装「一次只跑一个指令」的拦截器。",
  "run.start-install-allowlist": "正在写入常用指令的白名单。",
  "run.verify-opened": "已开启一个新的终端窗口，照里面的字做完再回来。",
  "run.verify-abandoned":
    "那个终端窗口没有走完（被关掉，或超过三分钟没动作）。这次不算验证通过，可以再按一次。",
  "run.verify-blocked":
    "这一行还没装好，先按同一行的「安装」再回来验——没装的东西验过了也不算数。",
  "run.verify-undeclared": "这一格没有可以验的东西。",
};
