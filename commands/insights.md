---
description: Generate an HTML insights report for your Forge and OpenCode usage
---

Generate a self-contained HTML insights report for the user's Forge and OpenCode activity, then open it in the default system browser.

## Arguments

`$ARGUMENTS` is optional. Parse it for:

- `--days N` — limit Forge usage/conversation data to the last N days (default 30, max 365).
- `--no-open` — write the file but do not open the browser.

Stop and ask for clarification only if the arguments are clearly invalid.

## 1. Collect data

### Forge data (via Forge MCP)

Call these read-only tools with the parsed `--days` value:

- `forge_insights_usage_turns` — pass `{ days, limit: 1000 }`.
- `forge_insights_conversations_summary` — pass `{ days }`.

If a tool is unavailable or returns no data, note that and continue.

### OpenCode session stats

Run in the terminal:

```bash
opencode stats
```

Capture the output. If the command supports machine-readable output (e.g. `--json` or `--format json`), prefer that; otherwise parse the human-readable text. If `opencode stats` is not available, skip this section.

Optionally, if you can discover the current OpenCode session id (check env vars like `OPENCODE_SESSION_ID`, `OPENCODE_SESSION`, or list sessions), also run:

```bash
opencode export <sessionId>
```

to include message/tool/detail stats for the active session. If you cannot determine the session id reliably, skip this step rather than guessing.

### Repo activity (if inside a git repo)

First check:

```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```

If inside a repo, collect for the same `--days` window:

```bash
git log --since="<days> days ago" --pretty=format:"%H|%ad|%s" --date=iso --numstat
```

Also get top changed files:

```bash
git log --since="<days> days ago" --pretty=format: --name-only | sort | uniq -c | sort -rn | head -20
```

## 2. Compute summary statistics

From the data above, compute at least:

- Total Forge messages and conversations.
- Total OpenRouter turns and estimated total cost (sum of non-null `cost`).
- Most-used models (from Forge usage rows and local message model counts).
- Messages per day over the date range.
- Number of messages that included tool calls.
- Total git commits, insertions, deletions, and unique files touched.
- Top tools/capabilities used (from `opencode stats` or tool-call counts).

## 3. Generate the HTML report

Write a single self-contained HTML file to:

```
/tmp/forge-insights-<timestamp>.html
```

Use the current timestamp formatted as `YYYYMMDD-HHMMSS`.

The report must be fully self-contained: inline CSS, no external fonts or images, no JavaScript required for the initial view (small inline JS for copy buttons is fine if included).

### Style guide

- Body background: `#f8fafc`
- Container: `max-width: 900px`, centered, padding `24px`.
- Font: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Headings: `#0f172a`.
- Muted text: `#64748b`.
- Cards: white background, `border: 1px solid #e2e8f0`, `border-radius: 12px`, `padding: 24px`, subtle shadow.
- Stats row: 4-6 big-number cards in a row.
- Charts: horizontal bar charts with a label, a track, a colored fill, and a value. Use these accent colors:
  - Forge/indigo: `#4f46e5`
  - Emerald: `#10b981`
  - Amber: `#f59e0b`
  - Cyan: `#06b6d4`
- Responsive: stack columns under `640px`.

### Report sections

Include these sections, in this order, with anchor links in a nav TOC at the top:

1. **Header**: "Forge Insights" + subtitle showing date range and totals.
2. **At a glance**: 4-6 stat cards (Messages, Conversations, Turns, Cost, Commits, Files touched).
3. **Forge usage**: bar charts for models used and messages by day; a small cost summary.
4. **Forge conversations**: total messages, role split, model breakdown, messages with tool calls.
5. **OpenCode sessions**: output from `opencode stats` rendered as stat cards and/or bar charts.
6. **Git activity**: commit count, lines inserted/deleted, net change, and a top-files list.
7. **Footer**: note that data is local/Forge-only and a refresh hint.

For any section with no data, render a card containing `<p class="empty">No data</p>` rather than omitting the section.

### Horizontal bar chart HTML pattern

Use this pattern for every bar chart:

```html
<div class="bar-row">
  <div class="bar-label" title="Label">Label</div>
  <div class="bar-track"><div class="bar-fill" style="width:PERCENT%;background:COLOR"></div></div>
  <div class="bar-value">VALUE</div>
</div>
```

Compute `PERCENT` as `(value / maxValue) * 100` capped at 100.

## 4. Write and open the file

Write the complete HTML to the file using the file-write tool or Bash. If Bash, you may use a heredoc:

```bash
cat > /tmp/forge-insights-<timestamp>.html <<'EOF'
<complete HTML>
EOF
```

Unless `--no-open` was requested, open the file in the default browser:

- macOS: `open /tmp/forge-insights-<timestamp>.html`
- Windows: `cmd /c start /tmp/forge-insights-<timestamp>.html`
- Linux: `xdg-open /tmp/forge-insights-<timestamp>.html`

Report the file path to the user and stop.
