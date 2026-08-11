---
type: standard
---

# 加一張卡

分層是 `view → viewmodel → store → api`；`domain` 不依賴任何人。

## 勾選清單

- [ ] src/domain/cards/{名字}.ts     卡片定義（checks + capabilities）
- [ ] src/domain/cards/index.ts      加進 CARDS（順序＝學生走的順序）
- [ ] src/domain/copy-keys.ts        新代號
- [ ] src/copy/{zh-TW,zh-CN,en}.ts   三語文案（少一個孤兒守衛會紅）
- [ ] src/adapter/server/probe.ts    新 check id 怎麼探測
- [ ] actions.ts / installers.ts     有安裝動作才要
- [ ] config-check.ts / config-install.ts  要寫設定檔才要
- [ ] terminal-opener.ts             有終端驗證或開窗按鈕才要
- [ ] materials/                     要發給學生的檔案
- [ ] content/walkthroughs/{三語}/   有「怎麼做」才要
- [ ] 測試                            每一格行為一題

## 不要這樣做

- 不要把探測或安裝的實作寫進卡片檔；那是 adapter 的事。
- 不要為了新卡片在 View 裡加 if。
- 不要把可判定的東西寫成人眼勾選。
