"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Preset = {
  name: string;
  description: string;
  source: string;
};

const PRESETS: Preset[] = [
  {
    name: "Welcome",
    description: "Simple landing card",
    source: `
import React from "react";

export default function Demo() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
      color: "white",
      fontFamily: "sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: 32 }}>
        <p style={{ letterSpacing: 2, opacity: 0.8 }}>CODE LAB</p>
        <h1 style={{ fontSize: 42, margin: "12px 0" }}>Hello, sandbox!</h1>
        <p style={{ fontSize: 18, opacity: 0.9 }}>Edit this example and hit Run.</p>
      </div>
    </main>
  );
}
    `,
  },
  {
    name: "Counter",
    description: "Stateful component",
    source: `
import React, { useState } from "react";

export default function Demo() {
  const [count, setCount] = useState(0);

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 42, marginBottom: 12 }}>{count}</h1>
        <button
          onClick={() => setCount((value) => value + 1)}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "12px 22px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          +1
        </button>
      </div>
    </main>
  );
}
    `,
  },
  {
    name: "Stats",
    description: "Product card layout",
    source: `
import React from "react";

export default function Demo() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#eef2ff",
      padding: 24,
      fontFamily: "sans-serif",
    }}>
      <div style={{
        background: "white",
        borderRadius: 20,
        padding: 28,
        width: "min(460px, 100%)",
        boxShadow: "0 20px 50px rgba(79, 70, 229, 0.12)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, color: "#6366f1", fontWeight: 700 }}>Revenue</p>
            <h2 style={{ margin: "8px 0 0", fontSize: 32 }}>+$24.8k</h2>
          </div>
          <span style={{
            background: "#dcfce7",
            color: "#15803d",
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 700,
          }}>
            +18.2%
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {[
            ["Users", "12.4k"],
            ["Orders", "3.8k"],
            ["CTR", "7.1%"],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#f8fafc", borderRadius: 12, padding: 14 }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
    `,
  },
];

const initialCode = PRESETS[0].source;

export default function HomePage() {
  const [source, setSource] = useState(initialCode);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activePreset, setActivePreset] = useState(PRESETS[0].name);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const token = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        token?: string;
        kind?: string;
        message?: string;
      };
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

    frame.postMessage({ token, type: "theme", theme }, "*");
    setStatus("Preview updated");
  }

  function handleThemeToggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    const frame = iframeRef.current?.contentWindow;
    if (frame) {
      frame.postMessage({ token, type: "theme", theme: next }, "*");
    }
  }

  function applyPreset(name: string) {
    const preset = PRESETS.find((item) => item.name === name);
    if (!preset) return;
    setActivePreset(name);
    setSource(preset.source);
    setError(null);
    setStatus("Preset loaded");
  }

  return (
    <main className="lab-shell">
      <div className="topbar panel">
        <div>
          <p className="eyebrow">sandbox</p>
          <h1>CodeLab Playground</h1>
        </div>

        <div className="topbar-actions">
          <button className="ghost-btn" type="button" onClick={handleThemeToggle}>
            {theme === "light" ? "Dark" : "Light"} mode
          </button>
          <button className="primary-btn" type="button" onClick={runCode}>
            Run preview
          </button>
        </div>
      </div>

      <div className="studio-grid">
        <aside className="panel sidebar">
          <div className="section-header">
            <span>Templates</span>
          </div>

          <div className="preset-list">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={`preset-btn ${activePreset === preset.name ? "active" : ""}`}
                onClick={() => applyPreset(preset.name)}
              >
                <span className="preset-name">{preset.name}</span>
                <span className="preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>

          <div className="info-card">
            <span className="info-label">Status</span>
            <strong>{status}</strong>
            <small>Live preview runs inside a sandboxed iframe.</small>
          </div>
        </aside>

        <section className="panel editor-panel">
          <div className="pane-header">
            <span>Component code</span>
            <span className="code-tag">Demo.tsx</span>
          </div>

          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
          />

          <div className="panel-actions">
            <button className="primary-btn" type="button" onClick={runCode}>
              Run now
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setSource(initialCode);
                setActivePreset(PRESETS[0].name);
                setError(null);
                setStatus("Reset");
              }}
            >
              Reset
            </button>
          </div>

          {error ? <div className="error-box">{error}</div> : null}
        </section>

        <section className="panel preview-panel">
          <div className="pane-header">
            <span>Live preview</span>
            <span className="preview-tag">{theme}</span>
          </div>

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
