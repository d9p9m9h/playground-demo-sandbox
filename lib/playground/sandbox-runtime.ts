type VendorBundle = {
  React: any;
  ReactDOM: any;
  ReactDOMClient: any;
  jsxRuntime: any;
  globals?: Record<string, unknown>;
};

type SandboxConfig = {
  nonce: string;
  token: string;
};

type Scope = {
  parent?: { postMessage(data: unknown, targetOrigin: string): void };
  __pbConfig?: SandboxConfig;
  __pbVendor?: VendorBundle;
  __pbApi?: {
    module: { exports: Record<string, unknown> };
    require(id: string): unknown;
    globals: Record<string, unknown>;
  };
};

const scope = globalThis as unknown as Scope;
const rawConfig = scope.__pbConfig;
const rawVendor = scope.__pbVendor;

if (!rawConfig || !rawVendor) {
  throw new Error("Sandbox runtime was initialized without config or vendor bundle.");
}

const config: SandboxConfig = rawConfig;
const vendor: VendorBundle = rawVendor;

const React = vendor.React;
const ReactDOMClient = vendor.ReactDOMClient;
const previewStyles = document.createElement("style");
previewStyles.nonce = config.nonce;
document.head.appendChild(previewStyles);

function post(message: any): void {
  const parent = scope.parent;
  if (!parent) return;
  parent.postMessage(message, "*");
}

type ConsoleMethod = "log" | "info" | "warn" | "error";
const originalConsole: Record<ConsoleMethod, (...args: unknown[]) => void> = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function formatArgument(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;

  try {
    const json = JSON.stringify(value, null, 2);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

for (const level of ["log", "info", "warn", "error"] as ConsoleMethod[]) {
  (console as any)[level] = (...args: unknown[]): void => {
    originalConsole[level](...args);
    post({ token: config.token, type: "log", level, text: args.map(formatArgument).join(" ") });
  };
}

function reportRuntimeError(error: unknown, context: string): void {
  renderCounter += 1;
  const err = error instanceof Error ? error : new Error(String(error));
  post({ token: config.token, type: "error", kind: "runtime", message: `${context}\n${err.message}`, stack: err.stack });
}

window.addEventListener("error", (event) => {
  reportRuntimeError(event.error ?? event.message, "Runtime error in preview.");
});

window.addEventListener("unhandledrejection", (event) => {
  reportRuntimeError(event.reason, "Unhandled promise rejection in preview.");
});

const moduleRegistry: Record<string, unknown> = {
  react: vendor.React,
  "react-dom": vendor.ReactDOM,
  "react-dom/client": vendor.ReactDOMClient,
  "react/jsx-runtime": vendor.jsxRuntime,
};

function requireShim(id: string): unknown {
  const found = moduleRegistry[id];
  if (!found) {
    throw new Error(`Module "${id}" is not available in the preview. Only react/react-dom are allowed.`);
  }
  return found;
}

const api: NonNullable<Scope["__pbApi"]> = {
  module: { exports: {} },
  require: requireShim,
  globals: vendor.globals ?? {},
};

scope.__pbApi = api;

const globalNames = Object.keys(api.globals).filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name));

function evaluateModule(code: string): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  api.module = module;

  const parameters = ["exports", "module", "require", ...globalNames].join(", ");
  const arguments_ = [
    "__pbApi.module.exports",
    "__pbApi.module",
    "__pbApi.require",
    ...globalNames.map((name) => `__pbApi.globals[${JSON.stringify(name)}]`),
  ].join(", ");

  const safeCode = code
    .replace(/<\/(script)/gi, "<\\/$1")
    .replace(/<!--/g, "<\\!--")
    .replace(/-->/g, "--\\>");

  const script = document.createElement("script");
  script.nonce = config.nonce;
  script.textContent = "(function (" + parameters + ") {\n" + safeCode + "\n})(" + arguments_ + ");";

  try {
    document.head.appendChild(script);
  } finally {
    script.remove();
  }

  return module.exports;
}

function selectComponent(exports: Record<string, unknown>, wanted: string): unknown {
  const target = (exports as any).__target;
  if (typeof target === "function") return target;
  if (wanted && wanted !== "default" && typeof exports[wanted] === "function") return exports[wanted];
  if (typeof exports.default === "function") return exports.default;
  const candidates = Object.keys(exports).filter(
    (key) => key !== "default" && key !== "__target" && key !== "__esModule" && typeof exports[key] === "function",
  );
  return candidates.length === 1 ? exports[candidates[0]] : undefined;
}

function toReactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toReactValue);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.__element === "string") {
      const elementProps = record.props ? Object.fromEntries(Object.entries(record.props as Record<string, unknown>).map(([key, child]) => [key, toReactValue(child)])) : undefined;
      if ("children" in record) {
        return React.createElement(record.__element, elementProps, toReactValue(record.children));
      }
      return React.createElement(record.__element, elementProps);
    }
    return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, toReactValue(child)]));
  }
  return value;
}

const container = document.getElementById("root");
let root: any = null;
let renderCounter = 0;

function unmount(): void {
  if (!root) return;
  try {
    root.unmount();
  } catch {}
  root = null;
}

function clearPreview(): void {
  unmount();
  if (container) container.innerHTML = "";
  previewStyles.textContent = "";
  post({ token: config.token, type: "cleared" });
}

function renderComponent(component: unknown, props: unknown): void {
  if (!container) return;
  unmount();
  container.innerHTML = "";

  if (typeof component !== "function") {
    renderCounter += 1;
    post({ token: config.token, type: "error", kind: "no-component", message: "No renderable component was found in this file." });
    return;
  }

  const currentRender = ++renderCounter;

  root = ReactDOMClient.createRoot(container, {
    onUncaughtError: (error: unknown) => reportRuntimeError(error, "Component failed to render."),
    onRecoverableError: (error: unknown) => reportRuntimeError(error, "Recoverable render error."),
  });

  root.render(React.createElement(component as any, Object.fromEntries(Object.entries((props ?? {}) as Record<string, unknown>).map(([key, value]) => [key, toReactValue(value)]))));

  setTimeout(() => {
    if (currentRender === renderCounter) {
      post({ token: config.token, type: "rendered" });
    }
  }, 0);
}

function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function handleRequest(request: any): void {
  switch (request.type) {
    case "render": {
      previewStyles.textContent = request.css ?? "";
      try {
        const exports = evaluateModule(request.code);
        const component = selectComponent(exports, request.component);
        renderComponent(component, request.props ?? {});
      } catch (error) {
        reportRuntimeError(error, "Failed to compile or execute code.");
      }
      return;
    }
    case "theme":
      applyTheme(request.theme);
      return;
    case "clear":
      clearPreview();
      return;
  }
}

window.addEventListener("message", (event) => {
  if (!scope.parent || event.source !== scope.parent) return;
  const request = event.data as any;
  if (!request || typeof request !== "object") return;
  if (request.token !== config.token) return;
  handleRequest(request);
});

post({ token: config.token, type: "ready" });
