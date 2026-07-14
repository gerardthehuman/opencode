/**
 * Token Tracker Plugin - Real-time Display (sidebar_content slot)
 *
 * Displays live token usage, request count, and cost in the sidebar.
 * Updates every 2 seconds during agent execution.
 *
 * Shows (sections can be hidden / roll in subagents via plugin options):
 *   Last Turn          ← yellow title while session is busy
 *   34.0k tokens
 *   1 requests
 *   $0.070 spent
 *
 *   Session
 *   366.3k tokens
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
 * Placement: sidebar_content with order 150 (right after built-in Context at 100).
 * Built-in orders (for reference): Context 100, LSP 300, MCP/Todo/Files nearby.
 *
 * Requirements:
 *   - OpenCode v1.4.3+
 *   - Sidebar must be open (Ctrl+X B) to see it
 */

/** @jsxImportSource @opentui/solid */
import type { PluginOptions } from "@opencode-ai/plugin"
import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
} from "@opencode-ai/plugin/tui"
import type { AssistantMessage, Message, Session } from "@opencode-ai/sdk/v2"
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js"

type SectionConfig = {
  hidden: boolean
  include_children: boolean
}

type TrackerConfig = {
  last_turn: SectionConfig
  session: SectionConfig
}

type TokenStats = {
  tokens: number
  reqs: number
  cost: number
}

const EMPTY: TokenStats = { tokens: 0, reqs: 0, cost: 0 }

const DEFAULT_SECTION: SectionConfig = {
  hidden: false,
  include_children: false,
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function parseSection(raw: unknown): SectionConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SECTION }
  const obj = raw as Record<string, unknown>
  return {
    hidden: asBool(obj.hidden, DEFAULT_SECTION.hidden),
    include_children: asBool(obj.include_children, DEFAULT_SECTION.include_children),
  }
}

function parseConfig(options: PluginOptions | undefined): TrackerConfig {
  return {
    last_turn: parseSection(options?.last_turn),
    session: parseSection(options?.session),
  }
}

function isAssistantWithTokens(m: Message): m is AssistantMessage {
  return m.role === "assistant" && !!m.tokens
}

function sumMessages(msgs: ReadonlyArray<Message>): TokenStats {
  const assistantMsgs = msgs.filter(isAssistantWithTokens)
  let tokens = 0
  let cost = 0
  let reqs = 0
  for (const m of assistantMsgs) {
    const inp = m.tokens.input || 0
    const out = m.tokens.output || 0
    tokens += inp + out
    cost += m.cost || 0
    if (inp > 0) reqs += 1
  }
  return { tokens, reqs, cost }
}

function sumSessionRollup(session: Session | undefined): TokenStats | null {
  if (!session?.tokens) return null
  const tokens = (session.tokens.input || 0) + (session.tokens.output || 0)
  return {
    tokens,
    reqs: 0,
    cost: session.cost || 0,
  }
}

function lastTurnStats(msgs: ReadonlyArray<Message>): TokenStats {
  const assistantMsgs = msgs.filter(isAssistantWithTokens)
  const lastMsg = [...assistantMsgs].reverse().find(m => (m.tokens.input || 0) > 0)
  if (!lastMsg) return EMPTY

  // One user turn can produce several assistant rounds (tool loops).
  const turn = assistantMsgs.filter(m => m.parentID === lastMsg.parentID)
  return sumMessages(turn)
}

/** Timestamp of the user message that starts the latest assistant turn. */
function lastTurnStartedAt(msgs: ReadonlyArray<Message>): number | null {
  const assistantMsgs = msgs.filter(isAssistantWithTokens)
  const lastMsg = [...assistantMsgs].reverse().find(m => (m.tokens.input || 0) > 0)
  if (!lastMsg) return null
  const user = msgs.find(m => m.id === lastMsg.parentID)
  return user?.time.created ?? lastMsg.time.created
}

function addStats(into: TokenStats, add: TokenStats) {
  into.tokens += add.tokens
  into.reqs += add.reqs
  into.cost += add.cost
}

function mergeStats(a: TokenStats, b: TokenStats): TokenStats {
  return {
    tokens: a.tokens + b.tokens,
    reqs: a.reqs + b.reqs,
    cost: a.cost + b.cost,
  }
}

async function statsForSession(api: TuiPluginApi, session: Session): Promise<TokenStats> {
  // Prefer live TUI message state when the child is already loaded.
  const local = api.state.session.messages(session.id)
  if (local.length > 0) return sumMessages(local)

  // Fall back to HTTP messages for accurate request counts.
  try {
    const msgRes = await api.client.session.messages({ sessionID: session.id })
    const infos = (msgRes.data ?? []).map(row => row.info)
    if (infos.length > 0) return sumMessages(infos)
  } catch {
    // ignore and try session rollup fields
  }

  // Last resort: session-level tokens/cost (no request count).
  return (
    sumSessionRollup(session) ??
    sumSessionRollup(api.state.session.get(session.id)) ??
    EMPTY
  )
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
  const totals = { ...EMPTY }
  const seen = new Set<string>([rootSessionId])
  // Queue of session IDs whose direct children we should expand.
  // For "last turn", only seed with root; then only expand children that pass the time filter
  // (or any descendant of a matched child).
  type QueueItem = { id: string; includeSubtree: boolean }
  const queue: QueueItem[] = [{ id: rootSessionId, includeSubtree: createdAfter === null }]

  while (queue.length) {
    const { id: parentId, includeSubtree } = queue.shift()!
    let children: Session[] = []
    try {
      const res = await api.client.session.children({ sessionID: parentId })
      if (res.data) children = res.data
    } catch {
      continue
    }

    for (const child of children) {
      if (seen.has(child.id)) continue
      seen.add(child.id)

      const matchesTurn =
        createdAfter === null ||
        includeSubtree ||
        (typeof child.time?.created === "number" && child.time.created >= createdAfter)

      if (!matchesTurn) continue

      queue.push({ id: child.id, includeSubtree: true })
      addStats(totals, await statsForSession(api, child))
    }
  }

  return totals
}

function TokenFooter(props: {
  api: TuiPluginApi
  session_id: string
  config: TrackerConfig
}) {
  const theme = () => props.api.theme.current
  const cfg = () => props.config

  const needChildren = () =>
    (!cfg().last_turn.hidden && cfg().last_turn.include_children) ||
    (!cfg().session.hidden && cfg().session.include_children)

  const [tick, setTick] = createSignal(0)
  const [allChildren, setAllChildren] = createSignal<TokenStats>(EMPTY)
  const [turnChildren, setTurnChildren] = createSignal<TokenStats>(EMPTY)

  const timer = setInterval(() => setTick(t => t + 1), 2000)
  onCleanup(() => clearInterval(timer))

  createEffect(() => {
    props.session_id
    setAllChildren(EMPTY)
    setTurnChildren(EMPTY)
  })

  createEffect(() => {
    const sessionId = props.session_id
    const config = cfg()
    tick()

    if (!needChildren()) {
      setAllChildren(EMPTY)
      setTurnChildren(EMPTY)
      return
    }

    let cancelled = false
    void (async () => {
      const msgs = props.api.state.session.messages(sessionId)
      const startedAt = lastTurnStartedAt(msgs)

      const [all, turn] = await Promise.all([
        config.session.include_children && !config.session.hidden
          ? loadChildStats(props.api, sessionId, null)
          : Promise.resolve(EMPTY),
        config.last_turn.include_children && !config.last_turn.hidden
          ? loadChildStats(props.api, sessionId, startedAt)
          : Promise.resolve(EMPTY),
      ])

      if (cancelled) return
      setAllChildren(all)
      setTurnChildren(turn)
    })()

    onCleanup(() => {
      cancelled = true
    })
  })

  const parentData = createMemo(() => {
    tick()
    const state = props.api.state
    const status = state.session.status(props.session_id)
    const isBusy = status?.type === "busy"
    const msgs = state.session.messages(props.session_id)
    return {
      last: lastTurnStats(msgs),
      parent: sumMessages(msgs),
      isBusy,
    }
  })

  const lastTurnData = createMemo(() => {
    const base = parentData().last
    if (!cfg().last_turn.include_children) return base
    return mergeStats(base, turnChildren())
  })

  const sessionData = createMemo(() => {
    const base = parentData().parent
    if (!cfg().session.include_children) return base
    return mergeStats(base, allChildren())
  })

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
    return `${Math.round(n)}`
  }

  const fmtCost = (n: number) => {
    if (n >= 1) return `$${n.toFixed(2)}`
    if (n >= 0.01) return `$${n.toFixed(3)}`
    return `$${n.toFixed(4)}`
  }

  const Section = (sectionProps: {
    title: string
    stats: TokenStats
    /** When set, title uses this color (e.g. yellow while working). */
    titleColor?: unknown
  }) => (
    <box>
      <text>
        <b style={{ fg: sectionProps.titleColor ?? theme().text }}>
          {sectionProps.title}
        </b>
      </text>
      <text>
        <span style={{ fg: theme().textMuted }}>{fmt(sectionProps.stats.tokens)}</span>
        <span style={{ fg: theme().textMuted }}> tokens</span>
      </text>
      <text>
        <span style={{ fg: theme().textMuted }}>{sectionProps.stats.reqs}</span>
        <span style={{ fg: theme().textMuted }}> requests</span>
      </text>
      <text>
        <span style={{ fg: theme().textMuted }}>{fmtCost(sectionProps.stats.cost)}</span>
        <span style={{ fg: theme().textMuted }}> spent</span>
      </text>
    </box>
  )

  const showLast = () => !cfg().last_turn.hidden
  const showSession = () => !cfg().session.hidden

  // Yellow while working: theme.secondary is the yellow token in forge (#ffd042).
  const lastTitleColor = () =>
    parentData().isBusy ? theme().secondary : theme().text

  return (
    <box gap={1}>
      {showLast() ? (
        <Section
          title="Last Turn"
          stats={lastTurnData()}
          titleColor={lastTitleColor()}
        />
      ) : null}
      {showSession() ? <Section title="Session" stats={sessionData()} /> : null}
    </box>
  )
}

// Built-in Context is order 100; sit just below it (quota uses the same band).
const SIDEBAR_ORDER = 150

const tui: TuiPlugin = async (api, options) => {
  const config = parseConfig(options)

  api.slots.register({
    order: SIDEBAR_ORDER,
    slots: {
      sidebar_content(_ctx, props: { session_id: string }) {
        return (
          <TokenFooter
            api={api}
            session_id={props.session_id}
            config={config}
          />
        )
      },
    },
  })
}

export default { id: "token-tracker", tui } satisfies TuiPluginModule
