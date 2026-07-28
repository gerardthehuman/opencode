/**
 * Open in Web — sidebar_content slot
 *
 * Clickable sidebar row that asks Forge to open the current OpenCode session in
 * the first-party web UI (embedded browser panel). The TUI cannot call Electron
 * IPC, so we append a JSONL request to FORGE_OPENCODE_WEB_BRIDGE_FILE; main
 * watches that file (open-web-bridge.ts), ensures a server, and navigates.
 *
 * Placement: order 110 — above progress-relay (120) and token-tracker (150).
 */

/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createSignal, Show, untrack } from "solid-js";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SIDEBAR_ORDER = 110;

function resolveBridgeFile(): string | null {
  const fromEnv = process.env.FORGE_OPENCODE_WEB_BRIDGE_FILE?.trim();
  return fromEnv || null;
}

function resolveDirectory(api: TuiPluginApi, sessionId: string): string | null {
  const fromSession = api.state.session.get(sessionId)?.directory?.trim();
  if (fromSession) return fromSession;
  const fromState = api.state.path?.directory?.trim();
  if (fromState) return fromState;
  const attachDir = process.env.FORGE_OPENCODE_ATTACH_DIR?.trim();
  if (attachDir) return attachDir;
  const projectDir = process.env.FORGE_OPENCODE_PROJECT_DIR?.trim();
  if (projectDir) return projectDir;
  return null;
}

function resolvePreferredBaseUrl(): string | null {
  const attach = process.env.FORGE_OPENCODE_ATTACH_URL?.trim();
  if (attach) return attach.replace(/\/$/, "");
  const server = process.env.FORGE_OPENCODE_SERVER_URL?.trim();
  if (server) return server.replace(/\/$/, "");
  return null;
}

function requestOpenWeb(
  api: TuiPluginApi,
  sessionId: string,
): { ok: true } | { ok: false; error: string } {
  const bridgeFile = resolveBridgeFile();
  if (!bridgeFile) {
    return {
      ok: false,
      error: "Forge bridge unavailable (restart terminal from Forge)",
    };
  }
  const directory = resolveDirectory(api, sessionId);
  if (!directory) {
    return { ok: false, error: "No workspace directory for this session" };
  }
  const baseUrl = resolvePreferredBaseUrl();
  const payload = {
    v: 1,
    action: "open-web" as const,
    sessionId,
    directory,
    ...(baseUrl ? { baseUrl } : {}),
  };
  try {
    mkdirSync(dirname(bridgeFile), { recursive: true });
    appendFileSync(bridgeFile, `${JSON.stringify(payload)}\n`, "utf8");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function OpenWebRow(props: { api: TuiPluginApi; session_id: string }) {
  const [hovered, setHovered] = createSignal(false);
  const [status, setStatus] = createSignal<"idle" | "sent" | "error">("idle");
  const [error, setError] = createSignal<string | null>(null);
  const theme = () => props.api.theme.current;
  const muted = () => theme().textMuted;
  const accent = () => theme().primary ?? theme().text;

  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const result = requestOpenWeb(props.api, props.session_id);
    if (result.ok) {
      setStatus("sent");
      setError(null);
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setError(result.error);
      setTimeout(() => {
        setStatus("idle");
        setError(null);
      }, 4000);
    }
  };

  const label = () => {
    if (status() === "sent") return "Opening web…";
    if (status() === "error") return "Open failed";
    return "Open in web";
  };

  const color = () => {
    if (status() === "error") return theme().error ?? muted();
    if (status() === "sent") return theme().success ?? accent();
    return hovered() ? accent() : muted();
  };

  const marker = () => (status() === "sent" ? "↗" : "▸");

  return (
    <box
      flexDirection="column"
      onMouseDown={onClick}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <text>
        <span style={{ fg: color() }}>{marker()} </span>
        <b style={{ fg: color() }}>{label()}</b>
        <Show when={hovered() && status() === "idle"}>
          <span style={{ fg: muted() }}> →</span>
        </Show>
      </text>
      <Show when={!!error()}>
        <text>
          <span style={{ fg: theme().error ?? muted() }}> {truncate(error() ?? "", 42)}</span>
        </text>
      </Show>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, props: { session_id: string }) {
        const sessionId = props.session_id;
        // untrack: host remounts footer on every signal otherwise (see token-tracker).
        return untrack(() => <OpenWebRow api={api} session_id={sessionId} />);
      },
    },
  });
};

export default { id: "open-web", tui } satisfies TuiPluginModule;
