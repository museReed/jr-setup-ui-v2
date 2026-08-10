import type { MessageKey } from "../domain/copy-keys.ts";

export const zhCN: Record<MessageKey, string> = {
  "card.claude": "Claude Code",
  "check.claude": "Claude Code CLI",
  "check.claude-auth": "Claude Code 登录状态",

  "check.hook": "一次只跑一个指令",
  "check.allowlist": "常用指令不用每次问你",

  "eye.claude-fullscreen":
    "第一次跑起来时，画面问你要用哪种显示模式——选好了就勾这格",

  "badge.untouched": "还没开始",
  "badge.visited-incomplete": "进行中",
  "badge.complete": "已完成",
  "badge.failed": "验证没过",

  "status.missing": "还没安装",
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
  "run.start-install-hook": "正在装「一次只跑一个指令」的拦截器。",
  "run.start-install-allowlist": "正在写入常用指令的白名单。",
  "run.verify-opened": "已开启一个新的终端窗口，照里面的字做完再回来。",
  "run.verify-abandoned":
    "那个终端窗口没有走完（被关掉，或超过三分钟没动作）。这次不算验证通过，可以再按一次。",
  "run.verify-blocked":
    "这张卡上还有没装完的东西，先把每一格都装好再验——只装一半去验，验过了也不算数。",
  "run.verify-undeclared": "这一格没有可以验的东西。",
};
