import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServerContext } from "./context.ts";
import { startHttpServer } from "./http.ts";

const PORT = Number(process.env.JR_PORT ?? 7430);
const WEB_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../web/dist",
);

const port = await startHttpServer(createServerContext(), PORT, WEB_ROOT);

console.log(`嚮導在 http://localhost:${port}`);
