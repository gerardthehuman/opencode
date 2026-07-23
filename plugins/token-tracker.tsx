/**
 * Token Tracker Plugin - Real-time Display (sidebar_content slot)
 *
 * Displays live token usage, request count, and cost in the sidebar.
 * Updates every 2 seconds during agent execution.
 *
 * Session also shows current context-window fill (token count + % of model
 * limit), matching OpenCode's built-in Context math. Forge disables
 * `internal:sidebar-context` so this is the sole context/spend strip.
 *
 * Each section is collapsed by default. Click the title (▸/▾) to expand
 * a provider breakdown: input, output, reasoning, cache read/write.
 * Role/type attribution (tool vs user vs system vs skill) is not available
 * from the OpenCode token API — only aggregate provider counts.
 *
 * Shows (sections can be hidden / roll in subagents via plugin options):
 *   ▸ Last Turn          ← yellow title while session is busy
 *   34.0k tokens
 *   1 requests
 *   $0.070 spent
 *
 *   Session
 *   48.2k context · 24% used   ← last assistant fill (parent only)
 *   ▾ 366.3k tokens            ← cumulative session
 *     300.0k input
 *      60.0k output
 *       6.3k reasoning
 *   100 requests
 *   $4.50 spent
 *
 * Configure in tui.json (tuple form):
 *   ["./plugins/token-tracker.tsx", {
 *     "last_turn": { "hidden": false, "include_children": false },
 *     "session":   { "hidden": false, "include_children": false }
 *   }]
 *
 * Defaults: both sections visible, children excluded.
 *
 * Placement: sidebar_content with order 150 (was below built-in Context at 100;
 * Context is disabled by Forge setup).
 *
 * Requirements:
 *   - OpenCode v1.4.3+
 *   - Sidebar must be open (Ctrl+X B) to see it
 */

/** @jsxImportSource @opentui/solid */
import type { PluginOptions } from "@opencode-ai/plugin";
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { AssistantMessage, Message, Session } from "@opencode-ai/sdk/v2";
import { createEffect, createMemo, createSignal, onCleanup, untrack, Show } from "solid-js";

type SectionConfig = {
  hidden: boolean;
  include_children: boolean;
};

type TrackerConfig = {
  last_turn: SectionConfig;
  session: SectionConfig;
};

type TokenStats = {
  tokens: number;
  reqs: number;
  cost: number;
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
};

/** Current context-window occupancy (last completed assistant turn). */
type ContextFill = {
  tokens: number;
  /** null when the model has no `limit.context`. */
  percent: number | null;
};

type ProviderLike = {
  id: string;
  models?: Record<string, { limit?: { context?: number } } | undefined>;
};

const EMPTY: TokenStats = {
  tokens: 0,
  reqs: 0,
  cost: 0,
  input: 0,
  output: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

const DEFAULT_SECTION: SectionConfig = {
  hidden: false,
  include_children: false,
};

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseSection(raw: unknown): SectionConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SECTION };
  const obj = raw as Record<string, unknown>;
  return {
    hidden: asBool(obj.hidden, DEFAULT_SECTION.hidden),
    include_children: asBool(obj.include_children, DEFAULT_SECTION.include_children),
  };
}

function parseConfig(options: PluginOptions | undefined): TrackerConfig {
  return {
    last_turn: parseSection(options?.last_turn),
    session: parseSection(options?.session),
  };
}

function isAssistantWithTokens(m: Message): m is AssistantMessage {
  return m.role === "assistant" && !!m.tokens;
}

/**
 * Context-window size for one assistant message — same buckets as OpenCode's
 * built-in Context panel (includes cache so % fill matches the window).
 */
function contextWindowTokens(m: AssistantMessage): number {
  return (
    (m.tokens.input || 0) +
    (m.tokens.output || 0) +
    (m.tokens.reasoning || 0) +
    (m.tokens.cache?.read || 0) +
    (m.tokens.cache?.write || 0)
  );
}

/**
 * Parent-session context fill only (subagents have their own windows).
 * Mirrors OpenCode: last assistant with `tokens.output > 0`.
 */
function contextFill(
  msgs: ReadonlyArray<Message>,
  providers: ReadonlyArray<ProviderLike>,
): ContextFill | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!isAssistantWithTokens(m)) continue;
    if ((m.tokens.output || 0) <= 0) continue;
    const tokens = contextWindowTokens(m);
    if (tokens <= 0) continue;
    const model = providers.find((p) => p.id === m.providerID)?.models?.[m.modelID];
    const limit = model?.limit?.context;
    const percent =
      typeof limit === "number" && limit > 0 ? Math.round((tokens / limit) * 100) : null;
    return { tokens, percent };
  }
  return null;
}

/** Headline total: prefer provider total, else input + output + reasoning (cache not double-counted). */
function headlineTokens(input: number, output: number, reasoning: number, total?: number): number {
  if (typeof total === "number" && total > 0) return total;
  return input + output + reasoning;
}

function sumMessages(msgs: ReadonlyArray<Message>): TokenStats {
  const assistantMsgs = msgs.filter(isAssistantWithTokens);
  let tokens = 0;
  let cost = 0;
  let reqs = 0;
  let input = 0;
  let output = 0;
  let reasoning = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  for (const m of assistantMsgs) {
    const inp = m.tokens.input || 0;
    const out = m.tokens.output || 0;
    const reason = m.tokens.reasoning || 0;
    const cRead = m.tokens.cache?.read || 0;
    const cWrite = m.tokens.cache?.write || 0;
    input += inp;
    output += out;
    reasoning += reason;
    cacheRead += cRead;
    cacheWrite += cWrite;
    tokens += headlineTokens(inp, out, reason, m.tokens.total);
    cost += m.cost || 0;
    if (inp > 0) reqs += 1;
  }
  return { tokens, reqs, cost, input, output, reasoning, cacheRead, cacheWrite };
}

function sumSessionRollup(session: Session | undefined): TokenStats | null {
  if (!session?.tokens) return null;
  const input = session.tokens.input || 0;
  const output = session.tokens.output || 0;
  const reasoning = session.tokens.reasoning || 0;
  const cacheRead = session.tokens.cache?.read || 0;
  const cacheWrite = session.tokens.cache?.write || 0;
  return {
    tokens: headlineTokens(input, output, reasoning),
    reqs: 0,
    cost: session.cost || 0,
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
  };
}

function lastTurnStats(msgs: ReadonlyArray<Message>): TokenStats {
  const assistantMsgs = msgs.filter(isAssistantWithTokens);
  const lastMsg = [...assistantMsgs].reverse().find((m) => (m.tokens.input || 0) > 0);
  if (!lastMsg) return EMPTY;

  // One user turn can produce several assistant rounds (tool loops).
  const turn = assistantMsgs.filter((m) => m.parentID === lastMsg.parentID);
  return sumMessages(turn);
}

/** Timestamp of the user message that starts the latest assistant turn. */
function lastTurnStartedAt(msgs: ReadonlyArray<Message>): number | null {
  const assistantMsgs = msgs.filter(isAssistantWithTokens);
  const lastMsg = [...assistantMsgs].reverse().find((m) => (m.tokens.input || 0) > 0);
  if (!lastMsg) return null;
  const user = msgs.find((m) => m.id === lastMsg.parentID);
  return user?.time.created ?? lastMsg.time.created;
}

function addStats(into: TokenStats, add: TokenStats) {
  into.tokens += add.tokens;
  into.reqs += add.reqs;
  into.cost += add.cost;
  into.input += add.input;
  into.output += add.output;
  into.reasoning += add.reasoning;
  into.cacheRead += add.cacheRead;
  into.cacheWrite += add.cacheWrite;
}

function mergeStats(a: TokenStats, b: TokenStats): TokenStats {
  return {
    tokens: a.tokens + b.tokens,
    reqs: a.reqs + b.reqs,
    cost: a.cost + b.cost,
    input: a.input + b.input,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  };
}

async function statsForSession(api: TuiPluginApi, session: Session): Promise<TokenStats> {
  // Prefer live TUI message state when the child is already loaded.
  const local = api.state.session.messages(session.id);
  if (local.length > 0) return sumMessages(local);

  // Fall back to HTTP messages for accurate request counts.
  try {
    // SDK v2 takes flat params keyed exactly `sessionID` — buildClientParams
    // silently drops unknown keys (e.g. a nested `path` object), leaving the
    // {sessionID} URL placeholder unsubstituted and the request failing.
    const msgRes = await api.client.session.messages({ sessionID: session.id });
    const infos = (msgRes.data ?? []).map((row) => row.info);
    if (infos.length > 0) return sumMessages(infos);
  } catch {
    // ignore and try session rollup fields
  }

  // Last resort: session-level tokens/cost (no request count).
  return sumSessionRollup(session) ?? sumSessionRollup(api.state.session.get(session.id)) ?? EMPTY;
}

/**
 * Walk descendant sessions.
 * When `createdAfter` is set, only include a subtree if its root child was
 * created on/after that timestamp (used to attribute subagents to last turn).
 */
async function loadChildStats(
  api: TuiPluginApi,
  rootSessionId: string,
  createdAfter: number | null = null,
): Promise<TokenStats> {
  const totals = { ...EMPTY };
  const seen = new Set<string>([rootSessionId]);
  // Queue of session IDs whose direct children we should expand.
  // For "last turn", only seed with root; then only expand children that pass the time filter
  // (or any descendant of a matched child).
  type QueueItem = { id: string; includeSubtree: boolean };
  const queue: QueueItem[] = [{ id: rootSessionId, includeSubtree: createdAfter === null }];

  while (queue.length) {
    const { id: parentId, includeSubtree } = queue.shift()!;
    let children: Session[] = [];
    try {
      const res = await api.client.session.children({ sessionID: parentId });
      if (res.data) children = res.data;
    } catch {
      continue;
    }

    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);

      const matchesTurn =
        createdAfter === null ||
        includeSubtree ||
        (typeof child.time?.created === "number" && child.time.created >= createdAfter);

      if (!matchesTurn) continue;

      queue.push({ id: child.id, includeSubtree: true });
      addStats(totals, await statsForSession(api, child));
    }
  }

  return totals;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function fmtCost(n: number) {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

function BreakdownLine(props: { value: number; label: string; muted: unknown }) {
  return (
    <Show when={props.value > 0}>
      <text>
        <span style={{ fg: props.muted }}> {fmt(props.value)}</span>
        <span style={{ fg: props.muted }}> {props.label}</span>
      </text>
    </Show>
  );
}

/** Module-level so expand state is not reset when TokenFooter re-renders. */
function TokenSection(props: {
  title: string;
  stats: TokenStats;
  theme: () => { text: unknown; textMuted: unknown };
  /** When set, title uses this color (e.g. yellow while working). */
  titleColor?: unknown;
  /** Session only: current context-window fill (replaces built-in Context). */
  context?: ContextFill | null;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const muted = () => props.theme().textMuted;

  return (
    <box>
      <text>
        <b style={{ fg: props.titleColor }}>{props.title}</b>
      </text>
      <Show when={props.context && props.context.tokens > 0}>
        <text>
          <span style={{ fg: muted() }}>{fmt(props.context!.tokens)}</span>
          <span style={{ fg: muted() }}> context</span>
          <Show when={props.context!.percent !== null}>
            <span style={{ fg: muted() }}> · {props.context!.percent}% used</span>
          </Show>
        </text>
      </Show>
      <box onMouseDown={() => setExpanded((v) => !v)}>
        <text>
          <span style={{ fg: muted() }}>{fmt(props.stats.tokens)}</span>
          <span style={{ fg: muted() }}> tokens</span>
          <Show when={props.stats.tokens > 0}>
            <span style={{ fg: props.theme().text }}>{expanded() ? " ▾" : " ▸"}</span>
          </Show>
        </text>
      </box>
      <Show when={props.stats.tokens > 0 && expanded()}>
        <box>
          <BreakdownLine value={props.stats.input} label="input" muted={muted()} />
          <BreakdownLine value={props.stats.output} label="output" muted={muted()} />
          <BreakdownLine value={props.stats.reasoning} label="reasoning" muted={muted()} />
          <BreakdownLine value={props.stats.cacheRead} label="cache read" muted={muted()} />
          <BreakdownLine value={props.stats.cacheWrite} label="cache write" muted={muted()} />
        </box>
      </Show>
      <text>
        <span style={{ fg: muted() }}>{props.stats.reqs}</span>
        <span style={{ fg: muted() }}> requests</span>
      </text>
      <text>
        <span style={{ fg: muted() }}>{fmtCost(props.stats.cost)}</span>
        <span style={{ fg: muted() }}> spent</span>
      </text>
    </box>
  );
}

function TokenFooter(props: { api: TuiPluginApi; session_id: string; config: TrackerConfig }) {
  const theme = () => props.api.theme.current;
  const cfg = () => props.config;

  const needChildren = () =>
    (!cfg().last_turn.hidden && cfg().last_turn.include_children) ||
    (!cfg().session.hidden && cfg().session.include_children);

  const [tick, setTick] = createSignal(0);
  const [allChildren, setAllChildren] = createSignal<TokenStats>(EMPTY);
  const [turnChildren, setTurnChildren] = createSignal<TokenStats>(EMPTY);

  const timer = setInterval(() => setTick((t) => t + 1), 2000);
  onCleanup(() => clearInterval(timer));

  createEffect(() => {
    props.session_id;
    setAllChildren(EMPTY);
    setTurnChildren(EMPTY);
  });

  createEffect(() => {
    const sessionId = props.session_id;
    const config = cfg();
    tick();

    if (!needChildren()) {
      setAllChildren(EMPTY);
      setTurnChildren(EMPTY);
      return;
    }

    let cancelled = false;
    void (async () => {
      const msgs = props.api.state.session.messages(sessionId);
      const startedAt = lastTurnStartedAt(msgs);

      const [all, turn] = await Promise.all([
        config.session.include_children && !config.session.hidden
          ? loadChildStats(props.api, sessionId, null)
          : Promise.resolve(EMPTY),
        config.last_turn.include_children && !config.last_turn.hidden
          ? loadChildStats(props.api, sessionId, startedAt)
          : Promise.resolve(EMPTY),
      ]);

      if (cancelled) return;
      setAllChildren(all);
      setTurnChildren(turn);
    })();

    onCleanup(() => {
      cancelled = true;
    });
  });

  const parentData = createMemo(() => {
    tick();
    const state = props.api.state;
    const status = state.session.status(props.session_id);
    const isBusy = status?.type === "busy";
    const msgs = state.session.messages(props.session_id);
    return {
      last: lastTurnStats(msgs),
      parent: sumMessages(msgs),
      context: contextFill(msgs, state.provider),
      isBusy,
    };
  });

  const lastTurnData = createMemo(() => {
    const base = parentData().last;
    if (!cfg().last_turn.include_children) return base;
    return mergeStats(base, turnChildren());
  });

  const sessionData = createMemo(() => {
    const base = parentData().parent;
    if (!cfg().session.include_children) return base;
    return mergeStats(base, allChildren());
  });

  const showLast = () => !cfg().last_turn.hidden;
  const showSession = () => !cfg().session.hidden;

  // Yellow while working: theme.secondary is the yellow token in forge (#ffd042).
  const lastTitleColor = () => (parentData().isBusy ? theme().secondary : theme().text);

  return (
    <box gap={1}>
      {showLast() ? (
        <TokenSection
          title="Last Turn"
          stats={lastTurnData()}
          theme={theme}
          titleColor={lastTitleColor()}
        />
      ) : null}
      {showSession() ? (
        <TokenSection
          title="Session"
          stats={sessionData()}
          theme={theme}
          context={parentData().context}
        />
      ) : null}
    </box>
  );
}

// Primary usage strip (built-in Context is disabled by Forge setup).
const SIDEBAR_ORDER = 150;

const tui: TuiPlugin = async (api, options) => {
  const config = parseConfig(options);

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, props: { session_id: string }) {
        // Untrack component creation (see progress-relay.tsx): without it the
        // host's tracked scope remounts the footer on every internal signal
        // update, resetting expand state and discarding fetched child stats.
        const sessionId = props.session_id;
        return untrack(() => <TokenFooter api={api} session_id={sessionId} config={config} />);
      },
    },
  });
};

export default { id: "token-tracker", tui } satisfies TuiPluginModule;
