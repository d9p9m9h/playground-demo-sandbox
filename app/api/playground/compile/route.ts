import { transform } from "sucrase";

export type CompileRequest = {
  fileName?: string;
  source: string;
  component?: string;
};

export type CompileResponse = {
  ok: boolean;
  code?: string;
  css?: string;
  html?: string;
  error?: string;
  stack?: string;
};

function declaresComponent(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|\\n)\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${escaped}\\b`,
  ).test(source);
}

function exportsComponent(source: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(`(?:^|\\n)\\s*export\\s+(?:default\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${escaped}\\b`),
    new RegExp(`(?:^|\\n)\\s*export\\s*\\{[^}]*\\b${escaped}\\b[^}]*\\}`),
  ].some((pattern) => pattern.test(source));
}

function appendTargetExport(code: string, name: string): string {
  return `${code}\n;exports.__target = ${name};`;
}

export async function POST(request: Request): Promise<Response> {
  let payload: CompileRequest;

  try {
    payload = (await request.json()) as CompileRequest;
  } catch {
    return Response.json({ ok: false, error: "Request body must be valid JSON." } as CompileResponse, { status: 400 });
  }

  if (typeof payload?.source !== "string") {
    return Response.json({ ok: false, error: "source must be a string." } as CompileResponse, { status: 400 });
  }

  const fileName = typeof payload.fileName === "string" ? payload.fileName : "Demo.tsx";
  const wanted = typeof payload.component === "string" && payload.component.length > 0 ? payload.component : "default";

  if (wanted !== "default" && !declaresComponent(payload.source, wanted)) {
    return Response.json({ ok: false, error: `"${wanted}" was not found in "${fileName}".` } as CompileResponse);
  }

  try {
    const { code } = transform(payload.source, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "automatic",
      production: true,
      filePath: fileName,
    });

    const finalCode = wanted !== "default" && !exportsComponent(payload.source, wanted)
      ? appendTargetExport(code, wanted)
      : code;

    return Response.json({ ok: true, code: finalCode, css: "" } as CompileResponse);
  } catch (error) {
    const err = error as Error;
    return Response.json({ ok: false, error: err.message, stack: err.stack } as CompileResponse);
  }
}
