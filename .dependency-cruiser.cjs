module.exports = {
  forbidden: [
    {
      name: "domain-無依賴",
      severity: "error",
      comment: "Domain 必須能獨立演進，不能反向依賴外層實作或第三方工具。",
      from: { path: "^src/domain" },
      to: { pathNot: "^src/domain" },
    },
    {
      name: "usecase-只能碰-domain",
      severity: "error",
      comment: "Use case 只編排 domain 與自己的 ports，不能知道 adapter 或基礎設施。",
      from: { path: "^src/usecase" },
      to: { pathNot: "^src/(usecase|domain)" },
    },
    {
      name: "copy-只能碰-domain",
      severity: "error",
      comment: "Copy 只能依賴 domain 的文案代號，不能被呈現或執行細節綁住。",
      from: { path: "^src/copy" },
      to: { pathNot: "^src/(copy|domain)" },
    },
    {
      name: "前後端不准互通",
      severity: "error",
      comment: "Web adapter 不得直接使用 server adapter，兩端只能透過既定邊界交換資料。",
      from: { path: "^src/adapter/web" },
      to: { path: "^src/adapter/server" },
    },
    {
      name: "前後端不准互通-反向",
      severity: "error",
      comment: "Server adapter 不得直接使用 web adapter，避免兩個外層實作互相綁定。",
      from: { path: "^src/adapter/server" },
      to: { path: "^src/adapter/web" },
    },
    {
      name: "view-不准碰-api",
      severity: "error",
      comment: "View 只負責繪製與送出意圖，所有 API 存取必須留在 store 邊界。",
      from: { path: "^src/adapter/web/view(?:/|$)" },
      to: { path: "^src/adapter/web/api" },
    },
    {
      name: "viewmodel-不准碰-api",
      severity: "error",
      comment: "ViewModel 必須是純呈現推導，不能直接發出 API 請求。",
      from: { path: "^src/adapter/web/viewmodel" },
      to: { path: "^src/adapter/web/api" },
    },
    {
      name: "viewmodel-不准回頭碰-view",
      severity: "error",
      comment: "Presenter 不能依賴 View，否則呈現元件會反過來決定資料模型。",
      from: { path: "^src/adapter/web/viewmodel" },
      to: { path: "^src/adapter/web/view(?:/|$)" },
    },
    {
      name: "controller-不准直接做-IO",
      severity: "error",
      comment: "Controller 只轉譯 HTTP 與呼叫 use case，程序和終端 I/O 必須經由 ports 注入。",
      from: { path: "^src/adapter/server/controllers" },
      to: {
        path: "^src/adapter/server/(terminal-opener|process-runner)(?:\\.ts)?$",
      },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
  },
};
