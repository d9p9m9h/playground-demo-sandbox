type VendorModule = {
  id: string;
  pkg: string;
  file: string;
};

const VENDOR_MODULES: VendorModule[] = [
  { id: "react", pkg: "react", file: "cjs/react.development.js" },
  { id: "react/jsx-runtime", pkg: "react", file: "cjs/react-jsx-runtime.development.js" },
  { id: "react-dom", pkg: "react-dom", file: "cjs/react-dom.development.js" },
  { id: "react-dom/client", pkg: "react-dom", file: "cjs/react-dom-client.development.js" },
  { id: "scheduler", pkg: "scheduler", file: "cjs/scheduler.development.js" },
];

const REACT_GLOBAL_NAMES = [
  "React",
  "Fragment",
  "createElement",
  "useState",
  "useEffect",
  "useLayoutEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useReducer",
  "useContext",
  "useId",
  "useTransition",
  "useDeferredValue",
  "useSyncExternalStore",
  "useOptimistic",
  "useActionState",
] as const;

function resolvePackageRoot(pkg: string): string {
  const candidates = [
    process.cwd(),
    process.cwd() + "/..",
    process.cwd() + "/../..",
  ].map((root) => `${root}/node_modules/${pkg}`);

  for (const candidate of candidates) {
    const fs = require("node:fs");
    const path = require("node:path");
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  }

  throw new Error(`Package "${pkg}" not found in node_modules.`);
}

function readVendorSource(module: VendorModule): string {
  const fs = require("node:fs");
  const path = require("node:path");
  const pkgRoot = resolvePackageRoot(module.pkg);
  const fullPath = path.join(pkgRoot, module.file);
  const source = fs.readFileSync(fullPath, "utf8");
  return source.replace(/process\.env\.NODE_ENV/g, JSON.stringify("development"));
}

export function escapeForScript(value: string): string {
  return value
    .replace(/<\/(script)/gi, "<\\/$1")
    .replace(/<!--/g, "<\\!--")
    .replace(/-->/g, "--\\>");
}

function buildRegistry(modules: VendorModule[]): string {
  const definitions = modules
    .map((module) => {
      const source = escapeForScript(readVendorSource(module));
      return `__pbDefine(${JSON.stringify(module.id)}, function (exports, module, require) {\n${source}\n});`;
    })
    .join("\n\n");

  const globals = REACT_GLOBAL_NAMES.map((name) => {
    if (name === "React") return "React: __pbReact";
    if (name === "Fragment") return "Fragment: __pbReact.Fragment";
    return `${name}: __pbReact.${name}`;
  }).join(",\n    ");

  return `/* Generated vendor bundle */
(function () {
  "use strict";
  var __pbModules = {};
  var __pbCache = {};
  function __pbDefine(id, factory) { __pbModules[id] = factory; }
  function __pbRequire(id) {
    if (Object.prototype.hasOwnProperty.call(__pbCache, id)) return __pbCache[id].exports;
    var factory = __pbModules[id];
    if (!factory) throw new Error('Module "' + id + '" cannot be loaded.');
    var mod = { exports: {} };
    __pbCache[id] = mod;
    factory(mod.exports, mod, __pbRequire);
    return mod.exports;
  }

${definitions}

  var __pbReact = __pbRequire("react");
  window.__pbVendor = {
    React: __pbReact,
    ReactDOM: __pbRequire("react-dom"),
    ReactDOMClient: __pbRequire("react-dom/client"),
    jsxRuntime: __pbRequire("react/jsx-runtime"),
    globals: {
    ${globals}
    },
  };
})();`;
}

export function buildVendorBundle(): string {
  return buildRegistry(VENDOR_MODULES);
}
