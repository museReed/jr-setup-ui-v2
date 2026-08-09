import { useEffect, useState } from "preact/hooks";

import { api } from "../api.ts";
import { copy } from "../../../copy/index.ts";
import { K } from "../../../domain/copy-keys.ts";
import type { ButtonModel } from "../viewmodel/card-model.ts";
import { cardModel } from "../viewmodel/card-model.ts";
import type { Store } from "../store.ts";
import { Button, Card, CheckItem, Checklist, Logo, Terminal } from "./ds/index.ts";
import { Walkthrough, type WalkthroughDoc } from "./Walkthrough.tsx";

// View 只做兩件事：把 ViewModel 的欄位貼到設計系統元件上，以及把使用者的動作
// 交回 store。任何「該顯示什麼」的判斷都不在這裡——那是 ViewModel 的事。
export function App({ store }: { store: Store }) {
  const [, bump] = useState(0);
  // 彈窗開著沒開著是純呈現狀態，沒有領域意義——不進 store。
  const [walkthrough, setWalkthrough] = useState<WalkthroughDoc | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => bump((n) => n + 1));
    void store.load();
    return unsubscribe;
  }, [store]);

  const state = store.get();
  const model = cardModel(state);

  const action = (button: ButtonModel) => (
    <Button
      key={button.action}
      tone={button.tone}
      disabled={button.disabled}
      onClick={() => void store.runAction(button.action, button.checkId)}
    >
      {button.label}
    </Button>
  );

  return (
    <main class="wizard-layout">
      <Card
        title={model.title}
        badge={model.badge}
        logo={<Logo id={model.logoId} />}
        footer={
          <>
            <span class="advance-hint">{model.advanceHint}</span>
            <Button disabled={!model.canAdvance}>{copy(K.card.next)}</Button>
            {/* 逆口不慶祝也不算完成——慶祝一件沒做成的事會讓學生以為自己過了。 */}
            {model.canSkip ? (
              <Button tone="success" onClick={() => void store.skip()}>
                {copy(K.card.skip)}
              </Button>
            ) : null}
          </>
        }
      >
        <Checklist
          title={model.checklist.title}
          done={model.checklist.done}
          total={model.checklist.total}
        >
          {model.checklist.rows.map((row) => (
            <CheckItem
              key={row.id}
              checked={row.checked}
              label={row.label}
              readOnly={row.readOnly}
              verifiedBy={row.verifiedBy}
              hint={row.hint}
              actions={row.buttons.length === 0 ? undefined : row.buttons.map(action)}
              onHelp={
                row.walkthroughId === undefined
                  ? undefined
                  : () => void openWalkthrough(row.walkthroughId!, setWalkthrough)
              }
              helpLabel={copy(K.card.help)}
              onChange={(checked) => void store.toggleEye(row.id, checked)}
            />
          ))}
        </Checklist>

        <div class="card-actions">{model.cardButtons.map(action)}</div>
      </Card>

      <Terminal
        title={copy(K.terminal.title)}
        lines={model.terminalLines}
        emptyHint={copy(K.terminal.empty)}
      />

      {walkthrough === null ? null : (
        <Walkthrough doc={walkthrough} onClose={() => setWalkthrough(null)} />
      )}
    </main>
  );
}

async function openWalkthrough(
  id: string,
  show: (doc: WalkthroughDoc) => void,
): Promise<void> {
  show((await api.walkthrough(id)) as WalkthroughDoc);
}
