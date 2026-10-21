import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { transform } from "sucrase";

import { escapeForScript } from "@/lib/playground/vendor";

function readToken(request: Request): string {
  const url = new URL(request.url);
  return url.searchParams.get("token") ?? "";
}

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildRuntimeScript(): string {
  const source = readRuntimeSource();
  const { code } = transform(source, { transforms: ["typescript"], filePath: "sandbox-runtime.ts" });
  return code;
}

function readRuntimeSource(): string {
  const path = join(process.cwd(), "lib", "playground", "sandbox-runtime.ts");
  if (!existsSync(path)) {
    throw new Error("sandbox runtime source missing");
  }
  return readFileSync(path, "utf8");
}

export async function GET(request: Request): Promise<Response> {
  const token = readToken(request);
  const nonce = createNonce();
  const config = JSON.stringify({ nonce, token });
  const runtime = escapeForScript(buildRuntimeScript());

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Playground preview</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        min-height: 100%;
        background: white;
        font-family: Arial, sans-serif;
      }
      body { padding: 20px; }
      #root:empty::after {
        content: "Preview is empty";
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.__pbConfig = ${config};
    </script>
    <script nonce="${nonce}" src="/playground/sandbox/vendor"></script>
    <script nonce="${nonce}">
${runtime}
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": [
        "default-src 'none'",
        `script-src 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'unsafe-inline'",
        "img-src data: blob:",
        "font-src 'none'",
        "connect-src 'none'",
        "form-action 'none'",
        "base-uri 'none'",
        "frame-ancestors 'self'",
      ].join("; "),
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
