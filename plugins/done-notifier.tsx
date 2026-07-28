/**
 * Done Notifier — TUI plugin
 *
 * Listens for OpenCode's `session.idle` event and writes a JSONL line to
 * FORGE_OPENCODE_DONE_NOTIFIER_FILE so Forge main can surface a native OS
 * notification when terminal work finishes.
 *
 * This plugin intentionally renders no UI; it only registers an event hook.
 */

/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function resolveBridgeFile(): string | null {
  const fromEnv = process.env.FORGE_OPENCODE_DONE_NOTIFIER_FILE?.trim();
  return fromEnv || null;
}

function resolveSessionDirectory(
  session?: { directory?: string | null } | null,
): string | undefined {
  const fromSession = session?.directory?.trim();
  if (fromSession) return fromSession;
  const fromEnv = process.env.FORGE_OPENCODE_PROJECT_DIR?.trim() || process.env.PWD?.trim();
  if (fromEnv) return fromEnv;
  return undefined;
}

function resolveSessionTitle(session?: { title?: string | null } | null): string | undefined {
  const fromSession = session?.title?.trim();
  if (fromSession) return fromSession;
  const envTitle = process.env.FORGE_OPENCODE_ATTACH_TITLE?.trim();
  if (envTitle) return envTitle;
  return undefined;
}

type DoneNotifierPayload = {
  v: number;
  type: "session.idle";
  sessionId: string;
  title?: string;
  directory?: string;
  finishedAt: number;
};

function emitIdleEvent(
  sessionId: string,
  session?: { title?: string | null; directory?: string | null } | null,
): void {
  const bridgeFile = resolveBridgeFile();
  if (!bridgeFile) return;

  const payload: DoneNotifierPayload = {
    v: 1,
    type: "session.idle",
    sessionId,
    title: resolveSessionTitle(session),
    directory: resolveSessionDirectory(session),
    finishedAt: Date.now(),
  };

  try {
    mkdirSync(dirname(bridgeFile), { recursive: true });
    appendFileSync(bridgeFile, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // Never let notification bridge failures disturb the OpenCode session.
  }
}

const tui: TuiPlugin = async (api) => {
  return {
    event: ({ event }) => {
      if (event?.type !== "session.idle") return;

      const sessionId =
        typeof event?.sessionId === "string"
          ? event.sessionId
          : typeof event?.session?.id === "string"
            ? event.session.id
            : null;

      if (!sessionId) return;

      try {
        const session = api.state.session.get(sessionId);
        emitIdleEvent(sessionId, session ?? undefined);
      } catch {
        emitIdleEvent(sessionId);
      }
    },
  };
};

export default { id: "done-notifier", tui } satisfies TuiPluginModule;
