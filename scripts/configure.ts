/**
 * Re-apply user-managed prefs onto Forge-managed OpenCode configs:
 *   opencode.config.jsonc → opencode.jsonc
 *   tui.config.jsonc      → tui.json
 *
 * Plugins (and OpenCode MCP servers) merge by identity; user overlay wins
 * conflicts. Forge keys left out of the overlay (e.g. theme, forge-tui) stay.
 *
 * Usage: npm run configure
 *    or: npx tsx scripts/configure.ts
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import deepmergeFactory from '@fastify/deepmerge'
import { parseJSONC, stringifyJSON } from 'confbox'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const USER_CONFIG_PATH = join(ROOT, 'opencode.config.jsonc')
const OPENCODE_CONFIG_PATH = join(ROOT, 'opencode.jsonc')
const USER_TUI_CONFIG_PATH = join(ROOT, 'tui.config.jsonc')
const TUI_CONFIG_PATH = join(ROOT, 'tui.json')

/** Non-plugin arrays replace rather than concat. */
const deepmerge = deepmergeFactory({
  mergeArray: (opts) => (_target, source) => opts.clone(source)
})

type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject
type JsonObject = { [key: string]: JsonValue }

/** Shared config surface for OpenCode / TUI JSON. */
type Config = JsonObject & {
  $schema?: string
  plugin?: PluginEntry[]
  mcp?: McpServers
  plugin_enabled?: Record<string, boolean>
}

type PluginEntry = string | [string, ...JsonValue[]]
type McpServers = Record<string, JsonObject>

function isObject(v: unknown): v is JsonObject {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isNodeErrno(err: unknown): err is NodeJS.ErrnoException {
  return err !== null && typeof err === 'object' && 'code' in err
}

async function loadConfig(path: string): Promise<Config> {
  try {
    const raw = await readFile(path, 'utf8')
    if (!raw.trim()) return {}
    const parsed = parseJSONC(raw)
    return isObject(parsed) ? (parsed as Config) : {}
  } catch (err) {
    if (isNodeErrno(err) && err.code === 'ENOENT') return {}
    throw err
  }
}

async function saveConfig(path: string, config: Config): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.configure-tmp-${process.pid}`
  await writeFile(tmp, `${stringifyJSON(config, { indent: 2 })}\n`, 'utf8')
  await rename(tmp, path)
}

/**
 * Deep-merge target ← source (source wins). Drops `plugin` and `mcp`
 * so those can be handled by dedicated merge helpers.
 */
function mergeConfig(
  source: Config,
  target: Config,
  defaultSchema: string
): Config {
  const { plugin: _sp, mcp: _sm, ...sourceRest } = source
  const { plugin: _tp, mcp: _tm, ...targetRest } = target
  const merged = deepmerge(targetRest, sourceRest) as Config
  if (!merged.$schema) {
    merged.$schema = defaultSchema
  }
  return merged
}

/**
 * Union plugins; source is applied after target so source wins on name.
 * Name = string entry, or first element of [name, options] tuples.
 * First-seen order is preserved (target order, then new source names).
 */
function mergePlugins(source: unknown, target: unknown): PluginEntry[] {
  const plugins: unknown[] = [
    ...(Array.isArray(target) ? target : []),
    ...(Array.isArray(source) ? source : [])
  ]
  const pluginNames = plugins.map((p) => (Array.isArray(p) ? p[0] : p))

  const byName = new Map<string, PluginEntry>()
  for (let i = 0; i < plugins.length; i++) {
    const name = pluginNames[i]
    if (typeof name !== 'string') continue
    byName.set(name, plugins[i] as PluginEntry)
  }
  return [...byName.values()]
}

/**
 * Merge MCP server maps by object key (server name). Source overwrites
 * target for the same key; entries are replaced whole, not deep-merged.
 */
function mergeMcpServers(source: unknown, target: unknown): McpServers {
  return {
    ...(isObject(target) ? (target as McpServers) : {}),
    ...(isObject(source) ? (source as McpServers) : {})
  }
}

function requireUserConfig(path: string, config: Config): void {
  if (!Object.keys(config).length) {
    throw new Error(`Missing or empty user config: ${path}`)
  }
}

// --- opencode.jsonc ---
const openCodeSource = await loadConfig(USER_CONFIG_PATH)
requireUserConfig(USER_CONFIG_PATH, openCodeSource)
const openCodeTarget = await loadConfig(OPENCODE_CONFIG_PATH)

const openCodeOutput: Config = {
  ...mergeConfig(
    openCodeSource,
    openCodeTarget,
    'https://opencode.ai/config.json'
  ),
  plugin: mergePlugins(openCodeSource.plugin, openCodeTarget.plugin),
  mcp: mergeMcpServers(openCodeSource.mcp, openCodeTarget.mcp)
}

await saveConfig(OPENCODE_CONFIG_PATH, openCodeOutput)
console.log(`Updated ${OPENCODE_CONFIG_PATH}`)

// --- tui.json ---
const tuiSource = await loadConfig(USER_TUI_CONFIG_PATH)
requireUserConfig(USER_TUI_CONFIG_PATH, tuiSource)
const tuiTarget = await loadConfig(TUI_CONFIG_PATH)

const tuiOutput: Config = {
  ...mergeConfig(tuiSource, tuiTarget, 'https://opencode.ai/tui.json'),
  plugin: mergePlugins(tuiSource.plugin, tuiTarget.plugin)
}

await saveConfig(TUI_CONFIG_PATH, tuiOutput)
console.log(`Updated ${TUI_CONFIG_PATH}`)
