import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServerContext } from "./context.ts";
import { startHttpServer } from "./http.ts";

const PORT = Number(process.env.JR_PORT ?? 7430);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, "../web/dist");
const CONTENT_ROOT = path.resolve(HERE, "../../../content");
const MATERIALS_ROOT = path.resolve(HERE, "../../../materials");

const port = await startHttpServer(createServerContext(CONTENT_ROOT, MATERIALS_ROOT), PORT, WEB_ROOT);

console.log(`嚮導在 http://localhost:${port}`);
