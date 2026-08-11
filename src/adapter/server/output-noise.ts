// 安裝器的進度動畫，在進到瀏覽器之前就丟掉。
//
// winget 不管有沒有人在看，都用同一種方式畫進度：轉圈符號（- \ | /）與方塊進度條靠
// \r 一格一格重畫。在真的終端機裡那是原地更新的一行動畫；透過管子接出來，每一格都
// 變成獨立的一行——裝一次 Python 就是幾百行符號（舊版 Windows VM 實測）。
// --disable-interactivity 關不掉它，winget 也沒有別的旗標，只能在我們這邊擋。
//
// 擋在這一層而不是畫面上：那幾百行原本每一行都是一次 SSE 事件加一次 DOM 插入，而
// 學生的 VM 本來就不快，不該把力氣花在畫垃圾上。原始輸出那一區也一起不收——它是
// 「看原始輸出」面板與失敗原因的來源，兩個都不需要轉圈符號。
//
// 不做平台判斷：判準是「這一行長什麼樣」，不是「誰吐的」。加了 win32 的 if，哪天
// Mac 那邊的工具吐出同一種東西就會漏掉，而那種 bug 只有真機看得到。

// ⚠️ 色碼用 fromCharCode(27) 組，不把那個字元本身放進原始碼：ESC 在編輯器與 diff 裡
// 都看不見，留一個隱形字元在這裡，下一個人只會看到一段少了開頭、看起來壞掉的正規式。
//
// 而它不能省——少了 ESC，`[warn] …` 這種一般文字的開頭也會被當成色碼吃掉。
const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, "g");

const PROGRESS_PATTERNS: readonly RegExp[] = [
  // 整行只有轉圈符號與空白。
  /^[\s\-\\|/]+$/,
  // 方塊進度條，後面通常跟著「已下載 / 總共」。兩者都可能單獨出現。
  /^[\s█▒░▓]+$/,
  /^[\s█▒░▓]*[\d.,]+\s*[KMGT]?B\s*\/\s*[\d.,]+\s*[KMGT]?B\s*$/,
];

// ⚠️ 只丟「整行都是進度」的行，不動任何帶內容的行。winget 會把訊息接在轉圈符號後面
// （實測看過 `   \ Cancelling operation`）——寧可留一點雜訊，也不要因為手滑的正規式
// 把唯一一句錯誤訊息吃掉。
export function isProgressNoise(line: string): boolean {
  const plain = line.replace(ANSI, "");

  // 空白行是版面的一部分（安裝器用它分段），不算進度雜訊。
  if (plain.trim() === "") {
    return false;
  }

  return PROGRESS_PATTERNS.some((pattern) => pattern.test(plain));
}
