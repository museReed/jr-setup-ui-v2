import assert from "node:assert/strict";
import { test } from "node:test";

import { mergePath, withPath, withUserBin } from "./spawn-env.ts";

// 這一題就是 #14：裝完了卡片還說「還沒安裝」。
test("macOS 的 PATH 會補上 ~/.local/bin——claude / codex 就裝在那裡", () => {
  const merged = withUserBin("/usr/bin:/bin", "/Users/student");

  assert.ok(merged.split(":").includes("/Users/student/.local/bin"));
});

test("Apple Silicon 的 Homebrew 目錄也要補，git / gh / python 靠它", () => {
  assert.ok(withUserBin("/usr/bin", "/Users/student").split(":").includes("/opt/homebrew/bin"));
});

test("已經在 PATH 裡的目錄不會被補第二次", () => {
  const current = "/Users/student/.local/bin:/usr/bin:/opt/homebrew/bin";
  const merged = withUserBin(current, "/Users/student").split(":");

  assert.equal(merged.filter((dir) => dir === "/Users/student/.local/bin").length, 1);
  assert.equal(merged.filter((dir) => dir === "/opt/homebrew/bin").length, 1);
});

test("原本的 PATH 排在補進去的前面，不會被蓋掉", () => {
  assert.match(withUserBin("/usr/bin:/bin", "/Users/student"), /^\/usr\/bin:\/bin:/);
});

// Windows 的環境變數不分大小寫，而 process.env 上那把鑰匙叫 `Path`。留著它的話
// Node 在 spawn 前只認先出現的那一把，新算的 PATH 整個被丟掉——整套重讀登錄檔
// 就等於從來沒有生效過。
test("withPath 會拿掉原本小寫的 Path 鍵，只留一把 PATH", () => {
  const env = withPath({ Path: "C:\\old", USERNAME: "student" }, "C:\\new");

  assert.deepEqual(Object.keys(env).filter((key) => key.toLowerCase() === "path"), ["PATH"]);
  assert.equal(env.PATH, "C:\\new");
  assert.equal(env.USERNAME, "student");
});

test("mergePath 依序合併、重複的目錄只留一份（Windows 不分大小寫）", () => {
  assert.equal(
    mergePath("C:\\machine", "C:\\user;C:\\MACHINE", "C:\\current"),
    "C:\\machine;C:\\user;C:\\current",
  );
});

test("mergePath 丟掉空欄位，不會生出開頭或結尾的分號", () => {
  assert.equal(mergePath("C:\\a;;", undefined, "  ;C:\\b"), "C:\\a;C:\\b");
});
