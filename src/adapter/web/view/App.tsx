import { useEffect, useState } from "preact/hooks";

import { cardModel, statusText } from "../viewmodel/card-model.ts";
import type { Store } from "../store.ts";

export function App({ store }: { store: Store }) {
  const [, bump] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => bump((n) => n + 1));
    void store.load();
    return unsubscribe;
  }, [store]);

  const state = store.get();
  const model = cardModel(state);

  return (
    <main>
      <section class="card" data-display={model.display}>
        <header>
          <h1>{model.title}</h1>
          <span class={`badge badge--${model.display}`}>{model.badge}</span>
        </header>

        <ul class="checklist">
          {model.checklist.map((row) => (
            <li key={row.id} data-status={row.status}>
              <span class="tick">{row.checked ? "✓" : "○"}</span>
              <span class="label">{row.label}</span>
              <span class="status">{statusText(row.status)}</span>
            </li>
          ))}
          {model.eyeChecks.map((row) => (
            <li key={row.id} class="eye">
              <label>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={(event) =>
                    void store.toggleEye(row.id, event.currentTarget.checked)
                  }
                />
                <span>{row.prompt}</span>
              </label>
            </li>
          ))}
        </ul>

        <div class="buttons">
          {model.buttons.map((button) => (
            <button
              key={button.action}
              class={button.kind}
              disabled={button.disabled}
              onClick={() => void store.runAction(button.action)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <footer>
          <span class="hint">{model.advanceHint}</span>
          <button class="next" disabled={!model.canAdvance}>
            下一張
          </button>
          {/* 逆口不慶祝也不算完成——慶祝一件沒做成的事會讓學生以為自己過了。 */}
          {model.canSkip ? (
            <button class="skip" onClick={() => void store.skip()}>
              先跳過這張
            </button>
          ) : null}
        </footer>
      </section>

      <section class="terminal">
        <div class="terminal-title">現在正在做什麼</div>
        <pre>
          {state.terminalLines.length === 0
            ? "按上面的按鈕，這裡會即時顯示進度。"
            : state.terminalLines.join("\n")}
        </pre>
      </section>
    </main>
  );
}
