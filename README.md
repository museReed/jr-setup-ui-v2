# jr-setup-ui-v2

工作坊環境設定嚮導的第二代。帶學生從一台乾淨的機器走到「AI agent 裝好、規則生效、技能包可用」。

前一代在 [`museReed/jr-setup-ui`](https://github.com/museReed/jr-setup-ui)（已凍結，只作為行為驗收基準保留）。

## 為什麼重寫

前一代的卡片是個沒有行為的資料袋——行為散在 `public/app.js` 的 `renderWizard()` 裡用 `card.kind` 分岔 17 處，外加 5 張 id-keyed 特例表。結果是「卡片完成」這件事在 5 個顯示位置有 4 種判法（前一代 `docs/audit-card-logic.md` §四 列出 7 條不一致）。

第二代把行為收回卡片本身：每張卡宣告自己的能力，UI 只讀能力。

## 架構

- **骨架**：Clean Architecture — `domain ← use case ← adapter`，依賴只能往內
- **前端呈現層**：MVVM（TypeScript + Vite + Preact）
- **後端呈現層**：MVC 的 Controller（`node:http`，零框架依賴）

## 文件

| 文件 | 內容 |
|---|---|
| `docs/prd/` | 決策紀錄：做什麼、不做什麼、否決了什麼 |
| `docs/architecture/adr/` | 架構決策與被否決的方案 |
| `docs/architecture/` | 施工圖（interface 草圖、實作步驟） |
| `docs/features/*/bdd/` | Gherkin `.feature`，驗收條件的正本 |

## 發佈

repo 是工作室（private），npm 套件是成品（public）。bootstrap 腳本另放在 public repo——學生機器上還沒有 Node，`npx` 用不了，第一行指令必須是 `curl | bash`。
