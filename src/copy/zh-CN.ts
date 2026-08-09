import type { MessageKey } from "../domain/copy-keys.ts";

export const zhCN: Record<MessageKey, string> = {
  "card.claude": "Claude Code",
  "check.claude": "Claude Code CLI",
  "check.claude-auth": "Claude Code 登录状态",

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
  "run.verify-opened": "已开启一个新的终端窗口，照里面的字做完再回来。",
  "run.verify-abandoned":
    "那个终端窗口没有走完（被关掉，或超过三分钟没动作）。这次不算验证通过，可以再按一次。",
};
