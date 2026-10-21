export type PlaygroundFile = { name: string; source: string };

export const playgroundFiles: PlaygroundFile[] = [
  {
    name: "Demo.tsx",
    source: `
import React from "react";

export default function Demo() {
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Hello sandbox demo</h1>
      <p>Edit this file and click Run.</p>
    </div>
  );
}
`,
  },
];

export const defaultPlaygroundFile = "Demo.tsx";
