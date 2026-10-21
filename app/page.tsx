"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const initialCode = `
import React from "react";

export default function Demo() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Hello from the sandbox</h1>
      <p>Replace this example with your own React component.</p>
    </main>
  );
}
`;

export default function HomePage() {
  const [source, setSource] = useState(initialCode);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const token = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; token?: string; kind?: string; message?: string };
      if (!data || typeof data !== "object") return;
      if (data.token !== token) return;

      if (data.type === "ready") {
        setStatus("Sandbox ready");
        return;
      }

      if (data.type === "error") {
        setError(data.message ?? "Sandbox error");
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [token]);

  async function runCode() {
    setStatus("Compiling...");
    setError(null);

    const response = await fetch("/api/playground/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "Demo.tsx", source }),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      code?: string;
      css?: string;
      error?: string;
    };

    if (!data.ok || !data.code) {
      setStatus("Compile failed");
      setError(data.error ?? "Unknown compile error");
      return;
    }

    const frame = iframeRef.current?.contentWindow;
    if (!frame) {
      setStatus("Preview not ready");
      return;
    }

    frame.postMessage(
      {
        token,
        type: "render",
        code: data.code,
        css: data.css ?? "",
        component: "default",
        props: {},
      },
      "*",
    );

    frame.postMessage(
      {
        token,
        type: "theme",
        theme,
      },
      "*",
    );

    setStatus("Preview updated");
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    const frame = iframeRef.current?.contentWindow;
    if (frame) {
      frame.postMessage({ token, type: "theme", theme: theme === "light" ? "dark" : "light" }, "*");
    }
  }

  return (
    <main className="app-shell">
      <div className="panel toolbar">
        <h1>Sandbox Playground Demo</h1>
        <div className="toolbar-actions">
          <button className="mode-toggle" onClick={toggleTheme} type="button">
            Theme: {theme}
          </button>
          <button className="primary" type="button" onClick={runCode}>Run</button>
        </div>
      </div>

      <div className="editor-grid">
        <section className="panel editor-pane">
          <textarea value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} />
          <div className="actions">
            <span className="status">Status: {status}</span>
            <button className="secondary" type="button" onClick={() => setSource(initialCode)}>Reset</button>
          </div>
          {error ? <div className="error">{error}</div> : null}
        </section>

        <section className="panel preview-pane">
          <iframe
            ref={iframeRef}
            title="sandbox preview"
            src={`/playground/sandbox?token=${token}`}
            sandbox="allow-scripts"
          />
        </section>
      </div>
    </main>
  );
}
