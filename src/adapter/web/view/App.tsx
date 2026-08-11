import { useEffect, useState } from "preact/hooks";

import { copy } from "../../../copy/index.ts";
import { K } from "../../../domain/copy-keys.ts";
import type { ButtonModel, ChecklistRow } from "../viewmodel/card-model.ts";
import { cardModel } from "../viewmodel/card-model.ts";
import type { Store } from "../store.ts";
import {
  Button,
  Card,
  CheckItem,
  Checklist,
  LocaleSwitch,
  Logo,
  Terminal,
} from "./ds/index.ts";
import { ChecklistStep } from "./ds/Checklist.tsx";
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
  const t = (key: Parameters<typeof copy>[1]): string => copy(state.locale, key);

  const action = (button: ButtonModel) => (
    <Button
      key={button.action}
      tone={button.tone}
      disabled={button.disabled}
      onClick={() => {
        if (button.opensTerminal === true) {
          void store.openTerminal(button.action);
          return;
        }

        void store.runAction(button.action, button.checkId, button.startKey);
      }}
    >
      {button.label}
    </Button>
  );

  const rowView = (row: ChecklistRow) => {
    const proofValue = row.proofValue;
    const walkthroughId = row.walkthroughId;

    return (
      <CheckItem
        key={row.id}
        checked={row.checked}
        label={row.label}
        readOnly={row.readOnly}
        verifiedBy={row.verifiedBy}
        hint={row.hint}
        actions={row.buttons.length === 0 ? undefined : row.buttons.map(action)}
        proofInput={
          proofValue === undefined
            ? undefined
            : {
                value: proofValue,
                onInput: (value) => void store.submitProof(row.id, value),
              }
        }
        onHelp={
          walkthroughId === undefined
            ? undefined
            : () => void openWalkthrough(store, walkthroughId, setWalkthrough)
        }
        helpLabel={t(K.card.help)}
        onChange={
          row.readOnly ? undefined : (checked) => void store.toggleEye(row.id, checked)
        }
      />
    );
  };

  return (
    <main class="wizard-layout">
      <div class="wizard-toolbar">
        <LocaleSwitch locale={state.locale} onSelect={(next) => store.setLocale(next)} />
      </div>

      <Card
        title={model.title}
        badge={model.badge}
        logo={<Logo id={model.logoId} />}
        footer={
          <>
            <span class="advance-hint">{model.advanceHint}</span>
            <span class="card-position">
              {model.position.index} / {model.position.total}
            </span>
            {model.hasNext ? (
              <Button
                disabled={!model.canAdvance}
                onClick={() => void store.goNext()}
              >
                {t(K.card.next)}
              </Button>
            ) : null}
            {/* 逆口不慶祝也不算完成——慶祝一件沒做成的事會讓學生以為自己過了。 */}
            {model.canSkip ? (
              <Button tone="success" onClick={() => void store.skip()}>
                {t(K.card.skip)}
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
          {model.checklist.rows
            .filter((row) => row.stepId === undefined)
            .map(rowView)}
          {model.checklist.steps.map((step) => (
            <ChecklistStep key={step.id} title={step.title} action={action(step.button)}>
              {step.rows.map(rowView)}
            </ChecklistStep>
          ))}
        </Checklist>

        <div class="card-actions">{model.cardButtons.map(action)}</div>
      </Card>

      <Terminal
        title={t(K.terminal.title)}
        lines={model.terminalLines}
        emptyHint={t(K.terminal.empty)}
        prompt={
          model.prompt === null
            ? null
            : {
                submitLabel: model.prompt.submitLabel,
                link: model.prompt.link,
                onSubmit: (text) => void store.sendInput(text),
              }
        }
        chromeExtra={
          model.cancel === null ? null : (
            <Button tone={model.cancel.tone} onClick={() => void store.cancel()}>
              {model.cancel.label}
            </Button>
          )
        }
        raw={{
          text: model.rawOutput,
          summaryLabel: t(K.terminal.rawSummary),
          emptyLabel: t(K.terminal.rawEmpty),
          copyLabel: t(K.terminal.copy),
          copiedLabel: t(K.terminal.copied),
          onCopy: () => void navigator.clipboard.writeText(model.rawOutput),
        }}
      />

      {walkthrough === null ? null : (
        <Walkthrough
          doc={walkthrough}
          locale={state.locale}
          platform={state.platform}
          onClose={() => setWalkthrough(null)}
        />
      )}
    </main>
  );
}

async function openWalkthrough(
  store: Store,
  id: string,
  show: (doc: WalkthroughDoc) => void,
): Promise<void> {
  show((await store.loadWalkthrough(id)) as WalkthroughDoc);
}
