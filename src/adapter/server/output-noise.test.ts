import assert from "node:assert/strict";
import { test } from "node:test";

import { isProgressNoise } from "./output-noise.ts";

const ESC = String.fromCharCode(27);

test("整行只有轉圈符號的那幾百行會被丟掉", () => {
  assert.equal(isProgressNoise("  -  "), true);
  assert.equal(isProgressNoise("\\"), true);
  assert.equal(isProgressNoise("  | / - \\ "), true);
});

test("方塊進度條也算進度", () => {
  assert.equal(isProgressNoise("  ██████▒▒▒▒░░░  "), true);
});

test("「已下載 / 總共」那種進度行也算", () => {
  assert.equal(isProgressNoise("██▒▒  12.3 MB / 45.6 MB"), true);
  assert.equal(isProgressNoise("  1,024 KB / 2,048 KB "), true);
});

// 這一題是這支過濾器最重要的界線：winget 會把訊息接在轉圈符號後面。吃掉它，
// 學生就會遇到「安裝失敗但畫面上一個字都沒有」。
test("轉圈符號後面接著訊息的行要留著", () => {
  assert.equal(isProgressNoise("   \\ Cancelling operation"), false);
});

test("空白行不算雜訊——安裝器用它分段", () => {
  assert.equal(isProgressNoise(""), false);
  assert.equal(isProgressNoise("   "), false);
});

test("帶色碼的進度行照樣認得出來", () => {
  assert.equal(isProgressNoise(`${ESC}[32m  - ${ESC}[0m`), true);
});

// 少了 ESC 的話這一行會被當成色碼開頭吃掉一段，剩下的剛好像進度。
test("一般訊息不會因為開頭是方括號就被誤判", () => {
  assert.equal(isProgressNoise("[warn] 這裡有話要說"), false);
  assert.equal(isProgressNoise("Successfully installed Python.Python.3.13"), false);
});
