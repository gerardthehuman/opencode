/**
 * Progress Relay Plugin - live subagent progress (sidebar_content slot)
 *
 * Subagents emit `[PROGRESS]` blocks (see opencode-agents/*.md), but those land
 * in the *child* session. The TUI renders only the parent session's parts, so
 * without this plugin the updates are invisible until the child finishes — the
 * orchestrator's delegation looks like a silent stall.
 *
 * This walks the current session's descendant sessions, pulls the most recent
 * `[PROGRESS]` block out of each, and renders it live in the sidebar.
 *
 *   ▾ Subagent Progress
 *     @explore · Repository overview        ← yellow while the child is busy
 *     Read root dir, package.json, git log
 *     ↳ map packages/ and apps/
 *     ⚠ tsconfig paths unreadable
 *
 * Config (opencode tui.json plugin_options["progress-relay"]):
 *   {
 *     "hidden":       false,   // hide the section entirely
 *     "max_agents":   4,       // most recent N children to show
 *     "show_findings": false,  // include the Findings bullets, not just Status
 *     "scope":        "turn"   // "turn" = children of the current turn, "session" = all
 *   }
 *
 * Placement: sidebar_content order 120 — above token-tracker (150); in-flight
 * progress is more time-sensitive than spend.
 */

/** @jsxImportSource @opentui/solid */
import type { PluginOptions } from "@opencode-ai/plugin";
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { Message, Session } from "@opencode-ai/sdk/v2";
import { createEffect, createMemo, createSignal, onCleanup, untrack, For, Show } from "solid-js";

type RelayConfig = {
  hidden: boolean;
  maxAgents: number;
  showFindings: boolean;
  scope: "turn" | "session";
};

type ProgressBlock = {
  agent: string;
  goal: string;
  status: string;
  findings: string[];
  next: string;
  blockers: string;
};

type AgentProgress = {
  sessionId: string;
  title: string;
  /** Agent name from the session title's "(@explore subagent)" suffix, known
   *  immediately on session creation — before any [PROGRESS] block arrives. */
  agentName: string | null;
  busy: boolean;
  createdAt: number;
  block: ProgressBlock | null;
};

const DEFAULT_CONFIG: RelayConfig = {
  hidden: false,
  maxAgents: 4,
  showFindings: false,
  scope: "turn",
};

/** Depth cap on the session tree — subagents cannot recurse far, but be safe. */
const MAX_DEPTH = 3;
/** Hard cap on sessions inspected per poll, so a long thread cannot stall the UI. */
const MAX_SESSIONS = 24;
const POLL_MS = 1500;

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseConfig(options: PluginOptions | undefined): RelayConfig {
  const raw = (options ?? {}) as Record<string, unknown>;
  const max = typeof raw.max_agents === "number" ? Math.floor(raw.max_agents) : NaN;
  return {
    hidden: asBool(raw.hidden, DEFAULT_CONFIG.hidden),
    maxAgents: Number.isFinite(max) && max > 0 ? Math.min(max, 10) : DEFAULT_CONFIG.maxAgents,
    showFindings: asBool(raw.show_findings, DEFAULT_CONFIG.showFindings),
    scope: raw.scope === "session" ? "session" : DEFAULT_CONFIG.scope,
  };
}

/** Real block markers start a line, per the format specified in opencode-agents/*.md. */
const PROGRESS_LINE = /^\[PROGRESS\]/;

/**
 * A subagent's own prose can mention the literal word "[PROGRESS]" (e.g.
 * reasoning about when it's supposed to emit one) without that being an
 * actual block. A genuine header's agent name is a short bare token; reject
 * anything else so a stray mention can't be mistaken for a real one.
 */
function isSaneAgentName(name: string): boolean {
  return name.length > 0 && name.length <= 24 && /^[\w-]+$/.test(name);
}

/**
 * Parse the most recent genuine `[PROGRESS]` block. Tolerant of drift within
 * a real block (missing fields still surface something useful), but a
 * candidate whose header doesn't look real is skipped in favour of an
 * earlier one rather than rendered as-is.
 */
function parseProgress(text: string): ProgressBlock | null {
  const lines = text.split("\n");

  for (let start = lines.length - 1; start >= 0; start--) {
    if (!PROGRESS_LINE.test(lines[start].trim())) continue;

    // A subagent commonly emits its final report in the same message, right after
    // the last [PROGRESS] block. Bound the scan so report prose cannot bleed into
    // the parsed fields: stop at a markdown rule/heading, or after MAX_BLOCK_LINES.
    const MAX_BLOCK_LINES = 14;
    const block: string[] = [];
    for (const line of lines.slice(start, start + MAX_BLOCK_LINES)) {
      const t = line.trim();
      if (block.length > 0 && (/^-{3,}$/.test(t) || /^#{1,6}\s/.test(t))) break;
      block.push(line);
    }

    const header = block[0].trim().slice("[PROGRESS]".length).trim();
    const [agentRaw, ...goalParts] = header.split("|");
    const agent = agentRaw.trim().replace(/^@/, "");
    if (!isSaneAgentName(agent)) continue;

    const goal = goalParts.join("|").trim();

    const field = (label: string): string => {
      const line = block.find((l) => l.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`));
      if (!line) return "";
      return line.slice(line.indexOf(":") + 1).trim();
    };

    const findings: string[] = [];
    let inFindings = false;
    for (const line of block.slice(1)) {
      const t = line.trim();
      if (/^findings:/i.test(t)) {
        inFindings = true;
        continue;
      }
      if (/^(next|blockers|status):/i.test(t)) {
        inFindings = false;
        continue;
      }
      if (inFindings && /^[•\-*]/.test(t)) findings.push(t.replace(/^[•\-*]\s*/, ""));
    }

    return {
      agent,
      goal,
      status: field("Status"),
      findings,
      next: field("Next"),
      blockers: field("Blockers"),
    };
  }

  return null;
}

/** Strip the "(@explore subagent)" suffix OpenCode appends to child titles. */
function cleanTitle(title: string): string {
  return title.replace(/\s*\(@?[\w-]+\s+subagent\)\s*$/i, "").trim();
}

/**
 * Pull the agent name out of that same "(@explore subagent)" suffix. OpenCode
 * sets it as soon as the child session exists, so it's available well before
 * the child emits its first [PROGRESS] block — use it as the row's name
 * fallback instead of a generic "@subagent" placeholder.
 */
function extractAgentName(title: string): string | null {
  const m = title.match(/\(@?([\w-]+)\s+subagent\)\s*$/i);
  return m ? m[1] : null;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, Math.max(0, n - 1))}…`;
}

/** Timestamp of the last user message — the boundary of the current turn. */
function lastTurnStartedAt(msgs: ReadonlyArray<Message>): number | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role === "user") {
      const created = m.time?.created;
      if (typeof created === "number") return created;
    }
  }
  return null;
}

/** Most recent `[PROGRESS]` block emitted in a child session. */
async function progressForSession(
  api: TuiPluginApi,
  sessionId: string,
): Promise<ProgressBlock | null> {
  const texts: string[] = [];

  // Prefer live TUI state, but it only exposes message info (no parts), so it
  // cannot carry text — fall through to HTTP, which returns parts.
  try {
    // SDK v2 takes flat params keyed exactly `sessionID` — buildClientParams
    // silently drops unknown keys (e.g. a nested `path` object), leaving the
    // {sessionID} URL placeholder unsubstituted and the request failing.
    const res = await api.client.session.messages({ sessionID: sessionId });
    for (const row of res.data ?? []) {
      const typed = row as {
        info?: { role?: string };
        parts?: Array<Record<string, unknown>>;
      };
      // Only the assistant's own output can contain a genuine progress block —
      // the user-role task/instruction message must never be scanned as one.
      if (typed.info?.role !== "assistant") continue;
      const parts = typed.parts ?? [];
      for (const part of parts) {
        if (part.type !== "text") continue;
        const t = part.text;
        if (typeof t === "string" && t.includes("[PROGRESS]")) texts.push(t);
      }
    }
  } catch {
    return null;
  }

  for (let i = texts.length - 1; i >= 0; i--) {
    const parsed = parseProgress(texts[i]);
    if (parsed) return parsed;
  }
  return null;
}

/** Walk descendant sessions, newest first, honouring the turn boundary. */
async function loadAgentProgress(
  api: TuiPluginApi,
  rootSessionId: string,
  createdAfter: number | null,
  limit: number,
): Promise<AgentProgress[]> {
  const seen = new Set<string>([rootSessionId]);
  const found: Session[] = [];
  let queue: Array<{ id: string; depth: number }> = [{ id: rootSessionId, depth: 0 }];

  while (queue.length && seen.size < MAX_SESSIONS) {
    const { id, depth } = queue.shift()!;
    if (depth >= MAX_DEPTH) continue;

    let children: Session[] = [];
    try {
      const res = await api.client.session.children({ sessionID: id });
      if (res.data) children = res.data;
    } catch {
      continue;
    }

    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const created = typeof child.time?.created === "number" ? child.time.created : 0;
      // A child of a matched child is in-turn by construction; only the direct
      // children of the root need the timestamp test.
      if (createdAfter !== null && depth === 0 && created < createdAfter) continue;
      found.push(child);
      queue.push({ id: child.id, depth: depth + 1 });
    }
  }

  found.sort((a, b) => (b.time?.created ?? 0) - (a.time?.created ?? 0));
  const recent = found.slice(0, limit);

  return Promise.all(
    recent.map(async (child): Promise<AgentProgress> => {
      const status = api.state.session.status(child.id);
      const rawTitle = child.title ?? "";
      return {
        sessionId: child.id,
        title: cleanTitle(rawTitle),
        agentName: extractAgentName(rawTitle),
        busy: status?.type === "busy",
        createdAt: child.time?.created ?? 0,
        block: await progressForSession(api, child.id),
      };
    }),
  );
}

function AgentRow(props: {
  entry: AgentProgress;
  config: RelayConfig;
  theme: () => { text: unknown; textMuted: unknown; warning?: unknown; success?: unknown };
  api: TuiPluginApi;
}) {
  const t = () => props.theme();
  const muted = () => t().textMuted;
  const block = () => props.entry.block;
  const [hovered, setHovered] = createSignal(false);

  const headColor = () =>
    props.entry.busy ? (t().warning ?? t().text) : (t().success ?? t().text);
  const marker = () => (props.entry.busy ? "▸" : "✓");
  const label = () => {
    const b = block();
    const name = b?.agent
      ? `@${b.agent}`
      : props.entry.agentName
        ? `@${props.entry.agentName}`
        : "@subagent";
    const goal = b?.goal || props.entry.title;
    return goal ? `${name} · ${truncate(goal, 34)}` : name;
  };
  const hasBlockers = () => {
    const v = block()?.blockers ?? "";
    return v.length > 0 && !/^none\b/i.test(v);
  };

  // Click navigates the TUI to the child subagent session. Stop propagation so
  // the surrounding message list does not also open its actions dialog, and
  // defer navigation so the current mouse event finishes before the child pane
  // renders a message under the same cursor position.
  const navigate = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setTimeout(() => {
      void props.api.route.navigate("session", { sessionID: props.entry.sessionId });
    }, 150);
  };

  return (
    <box
      onMouseDown={navigate}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <text>
        <span style={{ fg: headColor() }}>{marker()} </span>
        <b style={{ fg: headColor() }}>{label()}</b>
        <Show when={hovered()}>
          <span style={{ fg: muted() }}> →</span>
        </Show>
      </text>
      <Show
        when={block()?.status}
        fallback={
          <Show when={props.entry.busy}>
            <text>
              <span style={{ fg: muted() }}> working…</span>
            </text>
          </Show>
        }
      >
        <text>
          <span style={{ fg: muted() }}> {truncate(block()!.status, 40)}</span>
        </text>
      </Show>
      <Show when={props.config.showFindings}>
        <For each={block()?.findings ?? []}>
          {(f) => (
            <text>
              <span style={{ fg: muted() }}> • {truncate(f, 38)}</span>
            </text>
          )}
        </For>
      </Show>
      <Show when={block()?.next && props.entry.busy}>
        <text>
          <span style={{ fg: muted() }}> ↳ {truncate(block()!.next, 38)}</span>
        </text>
      </Show>
      <Show when={hasBlockers()}>
        <text>
          <span style={{ fg: t().warning ?? t().text }}> ⚠ {truncate(block()!.blockers, 38)}</span>
        </text>
      </Show>
    </box>
  );
}

function ProgressPanel(props: { api: TuiPluginApi; session_id: string; config: RelayConfig }) {
  const theme = () => props.api.theme.current;
  const cfg = () => props.config;

  const [tick, setTick] = createSignal(0);
  const [agents, setAgents] = createSignal<AgentProgress[]>([]);
  const [expanded, setExpanded] = createSignal(true);

  const timer = setInterval(() => setTick((t) => t + 1), POLL_MS);
  onCleanup(() => clearInterval(timer));

  // Reset when the user switches sessions.
  createEffect(() => {
    props.session_id;
    setAgents([]);
  });

  createEffect(() => {
    const sessionId = props.session_id;
    const config = cfg();
    tick();

    if (config.hidden) {
      setAgents([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const msgs = props.api.state.session.messages(sessionId);
      const after = config.scope === "turn" ? lastTurnStartedAt(msgs) : null;
      try {
        const next = await loadAgentProgress(props.api, sessionId, after, config.maxAgents);
        if (!cancelled) setAgents(next);
      } catch {
        // Transient API failure — keep the previous frame rather than blanking.
      }
    })();

    onCleanup(() => {
      cancelled = true;
    });
  });

  const busyCount = createMemo(() => agents().filter((a) => a.busy).length);

  // The root MUST be a concrete element, not a <Show> accessor: the slot host
  // evaluates the returned element in its own tracked scope, so a root-level
  // accessor leaks this component's signal reads into the host and every
  // setAgents remounts the slot (infinite mount loop, panel never visible).
  // With a static <box> root, the inner Show tracks inside the box's own
  // child scope instead.
  return (
    <box>
      <Show when={!cfg().hidden && agents().length > 0}>
        <box>
          <box
            onMouseDown={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            <text>
              <b style={{ fg: busyCount() > 0 ? (theme().warning ?? theme().text) : theme().text }}>
                Subagent Progress
              </b>
              <span style={{ fg: theme().textMuted }}>
                {busyCount() > 0 ? ` (${busyCount()} active)` : ""}
              </span>
              <span style={{ fg: theme().text }}>{expanded() ? " ▾" : " ▸"}</span>
            </text>
          </box>
          <Show when={expanded()}>
            <text>
              <span style={{ fg: theme().textMuted }}> click to open · parent to return</span>
            </text>
            <For each={agents()}>
              {(entry) => <AgentRow entry={entry} config={cfg()} theme={theme} api={props.api} />}
            </For>
          </Show>
        </box>
      </Show>
    </box>
  );
}

// token-tracker is order 150; sit just above it.
const SIDEBAR_ORDER = 120;

const tui: TuiPlugin = async (api, options) => {
  const config = parseConfig(options);

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, props: { session_id: string }) {
        // The host invokes this inside a tracked scope, and Bun's runtime JSX
        // transform (unlike the compile-time Solid transform) does not untrack
        // component creation. Without untrack, the panel's own signal reads
        // (e.g. the eager <Show when> memo) leak into the host's tracking, so
        // every setAgents remounts the component and resets its state — an
        // endless mount loop that keeps the panel invisible. Read session_id
        // first so session switches still re-render.
        const sessionId = props.session_id;
        return untrack(() => <ProgressPanel api={api} session_id={sessionId} config={config} />);
      },
    },
  });
};

export default { id: "progress-relay", tui } satisfies TuiPluginModule;
