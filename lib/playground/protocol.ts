export type SandboxLogLevel = "log" | "info" | "warn" | "error";

export type SandboxReadyMessage = { token: string; type: "ready" };
export type SandboxRenderedMessage = { token: string; type: "rendered" };
export type SandboxClearedMessage = { token: string; type: "cleared" };
export type SandboxErrorMessage = {
  token: string;
  type: "error";
  kind: "no-component" | "runtime";
  message: string;
  stack?: string;
};
export type SandboxLogMessage = {
  token: string;
  type: "log";
  level: SandboxLogLevel;
  text: string;
};

export type SandboxRenderRequest = {
  token: string;
  type: "render";
  code: string;
  css: string;
  component: string;
  props: unknown;
};

export type SandboxThemeRequest = {
  token: string;
  type: "theme";
  theme: "light" | "dark";
};

export type SandboxClearRequest = {
  token: string;
  type: "clear";
};

export type SandboxRequest = SandboxRenderRequest | SandboxThemeRequest | SandboxClearRequest;
export type SandboxMessage = SandboxReadyMessage | SandboxRenderedMessage | SandboxClearedMessage | SandboxErrorMessage | SandboxLogMessage;
