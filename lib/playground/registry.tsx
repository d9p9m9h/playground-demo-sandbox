export const defaultPlaygroundFile = "Demo.tsx";

export const playgroundSample = `
import React from "react";

export default function Demo() {
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Hello Playground</h1>
      <p>This is a ready-to-run sandbox demo.</p>
    </div>
  );
}
`;

export const playgroundFiles = [
  { name: "Demo.tsx", source: playgroundSample },
];
