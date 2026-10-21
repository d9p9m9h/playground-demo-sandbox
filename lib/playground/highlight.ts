import { readFileSync } from "node:fs";
import { join } from "node:path";

import Prism from "prismjs";

const COMPONENTS = ["prism-typescript.js", "prism-jsx.js", "prism-tsx.js"];
const componentsFolder = join(process.cwd(), "node_modules", "prismjs", "components");
let loaded = false;

function loadComponents(): void {
  if (loaded) return;
  for (const component of COMPONENTS) {
    const path = join(componentsFolder, component);
    const source = readFileSync(path, "utf8");
    const factory = new Function("Prism", "module", "exports", source);
    factory(Prism, { exports: {} }, {});
  }
  loaded = true;
}

export function highlightTsx(source: string): string {
  loadComponents();
  const grammar = Prism.languages.tsx;
  if (!grammar) return source.replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char] as string));
  return Prism.highlight(source, grammar, "tsx");
}
