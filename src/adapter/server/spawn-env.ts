import { spawn } from "node:child_process";
import { homedir } from "node:os";

// 子程序要用的 PATH，每次現算。
//
// 病因兩個平台一樣：**PATH 是每個行程各自一份快照**。安裝器剛寫進去的目錄，
// 對已經在跑的嚮導不存在——於是「裝完了，卡片還說沒裝」。學生看到的是最容易讓人
// 重按第二次的畫面（Mac VM 實測 #14：輸出印著 Installation complete!，那一格是紅的）。
//
// 藥不一樣：macOS 是把已知落點補進 PATH；Windows 是重讀登錄檔（winget 寫在那裡）。

const REFRESH_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 2_000;

// 只補這兩個目錄就夠：
//   ~/.local/bin       claude / codex 原生安裝器的落點
//   /opt/homebrew/bin  Apple Silicon 的 Homebrew（git / gh / python / ghostty 靠它）
// 兩者都是「安裝當下才被寫進 shell 設定檔」的目錄。
const DARWIN_EXTRA_BINS = ["~/.local/bin", "/opt/homebrew/bin"];

export function withUserBin(currentPath: string | undefined, home: string): string {
  const entries = (currentPath ?? "").split(":").filter((entry) => entry.trim() !== "");
  const additions = DARWIN_EXTRA_BINS.map((dir) =>
    dir.startsWith("~/") ? `${home}/${dir.slice(2)}` : dir,
  ).filter((dir) => !entries.includes(dir));

  return [...entries, ...additions].join(":");
}

// ⚠️ Windows 支援最陰的一個坑。那邊環境變數不分大小寫，而 `process.env` 上那把鑰匙
// 實際叫 `Path`。所以 `{ ...process.env, PATH: 新的 }` 會同時有兩把，而 Node 在 win32
// spawn 前只留**先出現的那一把**（`Path`＝舊快照）——新算的整個被丟掉。
//
// 症狀：登錄檔讀對了、合併也算對了，子程序拿到的還是舊 PATH，那一列照樣顯示未安裝。
// macOS 不受影響（大小寫有分，Node 也不做這個過濾）。
export function withPath(
  base: NodeJS.ProcessEnv,
  value: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};

  for (const [key, existing] of Object.entries(base)) {
    if (key.toLowerCase() !== "path") {
      env[key] = existing;
    }
  }

  env.PATH = value;
  return env;
}

// 依序合併、去重（Windows 的路徑不分大小寫，所以比對前先轉小寫）。
export function mergePath(...sources: (string | undefined)[]): string {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const source of sources) {
    for (const entry of (source ?? "").split(";")) {
      const trimmed = entry.trim();
      const key = trimmed.toLowerCase();

      if (trimmed !== "" && !seen.has(key)) {
        seen.add(key);
        merged.push(trimmed);
      }
    }
  }

  return merged.join(";");
}

interface RegistryPath {
  readonly machinePath: string;
  readonly userPath: string;
}

function readRegistryPath(): Promise<RegistryPath | null> {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";

    const finish = (value: RegistryPath | null): void => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    };

    let child;

    try {
      child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "[Environment]::GetEnvironmentVariable('Path','Machine');" +
            "'---';" +
            "[Environment]::GetEnvironmentVariable('Path','User')",
        ],
        { shell: false, stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, REFRESH_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.resume();
    child.once("error", () => finish(null));
    child.once("close", (exitCode) => {
      if (exitCode !== 0) {
        finish(null);
        return;
      }

      const [machinePath = "", userPath = ""] = stdout.split("---");
      finish({ machinePath: machinePath.trim(), userPath: userPath.trim() });
    });
  });
}

let cache: { at: number; env: NodeJS.ProcessEnv } | null = null;
// ⚠️ 「同時只讀一次」不是效能潔癖：快取是**拿到結果之後**才寫的，而環境探測是十幾支
// 同時進來的——每一支都撲空、每一支都自己 spawn 一支 powershell 讀同一份登錄檔。
// 舊版 Windows VM 實測：單獨讀一次 603ms（冷的更久），十幾支併發下來第一次開頁要等
// 約 14 秒，而那段時間畫面上一張卡都沒有。重整就正常，因為 powershell 被暖起來了
// ——所以這個問題很容易被當成偶發。
let inFlight: Promise<NodeJS.ProcessEnv> | null = null;

export async function spawnEnv(now = Date.now()): Promise<NodeJS.ProcessEnv> {
  if (process.platform === "darwin") {
    return { ...process.env, PATH: withUserBin(process.env.PATH, homedir()) };
  }

  if (process.platform !== "win32") {
    return process.env;
  }

  if (cache !== null && now - cache.at < CACHE_TTL_MS) {
    return cache.env;
  }

  if (inFlight !== null) {
    return inFlight;
  }

  inFlight = readEnvFromRegistry(now);

  try {
    return await inFlight;
  } finally {
    // 成功失敗都要放掉，否則失敗一次之後永遠卡在同一個 promise 上。
    inFlight = null;
  }
}

async function readEnvFromRegistry(now: number): Promise<NodeJS.ProcessEnv> {
  const registry = await readRegistryPath();

  if (registry === null) {
    return process.env;
  }

  const env = withPath(
    process.env,
    mergePath(
      registry.machinePath,
      registry.userPath,
      process.env.PATH,
      // claude 的 Windows 安裝器把執行檔放進 %USERPROFILE%\.local\bin，然後跑
      // `claude.exe install` 做 shell 整合——它**不寫**登錄檔（VM 實測）。codex 那支
      // 會寫。補一份保險：重讀登錄檔本來就是為了「剛裝好的要叫得動」。
      `${homedir()}\\.local\\bin`,
    ),
  );
  cache = { at: now, env };
  return env;
}
