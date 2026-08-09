import { render } from "preact";

import { createStore } from "./store.ts";
import { App } from "./view/App.tsx";

const root = document.getElementById("app");

if (root === null) {
  throw new Error("找不到掛載點 #app");
}

render(<App store={createStore()} />, root);
