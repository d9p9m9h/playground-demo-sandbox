import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Scanner } from "@tailwindcss/oxide";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";

const appStylesheetPath = join(process.cwd(), "app", "globals.css");
const tailwindImport = '@import "tailwindcss";';

export async function compilePreviewStyles(source: string): Promise<string> {
  const appStylesheet = readFileSync(appStylesheetPath, "utf8");
  if (!appStylesheet.includes(tailwindImport)) {
    throw new Error(`Tailwind import not found in ${appStylesheetPath}.`);
  }

  const candidates = new Scanner({ sources: [] }).scanFiles([{ content: source, extension: "tsx" }]);
  const stylesheet = [
    appStylesheet.replace(tailwindImport, '@import "tailwindcss" source(none);'),
    `@source inline(${JSON.stringify(candidates.join(" "))});`,
  ].join("\n");

  const result = await postcss([tailwindcss({ base: process.cwd(), optimize: false })]).process(stylesheet, { from: appStylesheetPath });
  return result.css;
}
