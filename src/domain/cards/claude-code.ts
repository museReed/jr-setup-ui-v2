import type { Card } from "../card.ts";
import { K } from "../copy-keys.ts";

export const FULLSCREEN_PROOF = "fullscreen-copy-ok-7f3a91";

export const claudeCodeCard: Card = {
  id: "claude",
  sectionId: "env",
  labelKey: K.card.claude,
  logoId: "logo-claude",
  checks: [
    {
      id: "claude",
      labelKey: K.check.claude,
      capabilities: [
        { kind: "install", action: "install-claude", startKey: K.run.startInstallClaude },
        // 開真的終端跑一次才算數。探測只看得到「檔案在不在」，看不到「跑起來會怎樣」。
        { kind: "verify", via: "terminal", action: "verify-claude" },
      ],
    },
    {
      id: "claude-auth",
      labelKey: K.check.claudeAuth,
      // 這一格沒完成是「還沒登入」，不是「還沒安裝」——共用那句的話，學生剛看著
      // CLI 裝完，下面卻寫著還沒安裝。
      missingKey: K.status.notLoggedIn,
      // 登入沒有另外的行為驗證：`claude auth status` 問的就是行為本身。
      capabilities: [
        { kind: "login", action: "login-claude", startKey: K.run.startLoginClaude },
      ],
    },
  ],
  capabilities: [
    {
      kind: "manual-step",
      id: "fullscreen-open",
      action: "fullscreen-open",
      titleKey: K.manualStep.fullscreenOpenTitle,
      buttonKey: K.manualStep.fullscreenOpenButton,
    },
    {
      kind: "eye-check",
      id: "fullscreen-yes",
      stepId: "fullscreen-open",
      promptKey: K.eye.fullscreenYes,
      detailKey: K.eye.fullscreenYesDetail,
    },
    {
      kind: "eye-check",
      id: "fullscreen-mouse",
      stepId: "fullscreen-open",
      promptKey: K.eye.fullscreenMouse,
      detailKey: K.eye.fullscreenMouseDetail,
    },
    {
      kind: "manual-step",
      id: "fullscreen-proof",
      action: "fullscreen-proof",
      titleKey: K.manualStep.fullscreenProofTitle,
      buttonKey: K.manualStep.fullscreenProofButton,
    },
    {
      kind: "paste-proof",
      id: "fullscreen-copy",
      stepId: "fullscreen-proof",
      promptKey: K.eye.fullscreenCopy,
      detailKey: K.eye.fullscreenCopyDetail,
      walkthrough: "fullscreen-copy",
      expected: FULLSCREEN_PROOF,
    },
    { kind: "recheck" },
  ],
};
