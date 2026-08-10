import { render } from "preact";

import { createStore } from "./store.ts";
import { App } from "./view/App.tsx";
import spriteUrl from "./vendor/logos.svg?url";

// SVG sprite 必須先進 document，<use href="#logo-x"> 才找得到 symbol。
// 指向外部檔案的 href="logos.svg#logo-x" 在 Chrome 會被擋掉——那是 sprite 的老坑，
// 少了這幾行畫面上只會有一塊空白，而且不會報錯。
async function mountSprite(): Promise<void> {
  const sprite = await (await fetch(spriteUrl)).text();
  const holder = document.createElement("div");
  holder.innerHTML = sprite;
  holder.style.display = "none";
  document.body.prepend(holder);
}

const root = document.getElementById("app");

if (root === null) {
  throw new Error("找不到掛載點 #app");
}

// logo 載不到不該擋住整個嚮導——少一個圖示比整頁空白好。
void mountSprite().catch(() => {});
render(<App store={createStore()} />, root);
