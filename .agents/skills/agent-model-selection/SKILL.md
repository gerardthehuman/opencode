---
name: agent-model-selection
description: "Create or revise AI model presets for multi-agent workflows by matching a user-provided pool of models and variants to agent roles, capabilities, context needs, benchmark evidence, and cost per successful task. Use when choosing models for agents, comparing models across providers, defining quality or lean presets, or revisiting assignments after pricing, quota, benchmark, capability, or usage changes."
---

# Agent Model Selection

A preset is a routing policy, not a leaderboard. Optimize the **workflow Pareto frontier**: the best role-specific tradeoff among capability, intelligence, cost, context, latency, quota, modalities, and tool reliability.

Treat the models the user makes available as the candidate pool. Do not assume a preferred provider, provider combination, or model family. Providers matter only where they change availability, capabilities, economics, limits, or reliability.

## Workflow

### 1. Profile every agent before comparing models

Read the agent instructions first. For each role, record:

- decision leverage: how expensive a bad answer is downstream
- mutation risk: read-only, planning, or state/code-changing
- context load: how much repository, tool, conversation, or source material it typically reads
- output load: how much reasoning, code, or reporting it typically generates
- call frequency: occasional coordinator or high-volume worker
- tool depth: simple reads versus long tool/terminal trajectories
- required capabilities: reasoning, coding, browsing, structured output, function/tool calling, code execution, or other model features
- input modalities: text only, images, documents, audio, or other inputs the role may actually receive
- tool-use requirements: whether the model must reliably select tools, form valid arguments, recover from tool errors, and continue multi-step trajectories

Capabilities are eligibility constraints before they are quality signals. A model that cannot consume the role's inputs or use its required tools is not a candidate regardless of benchmark score.

Do not choose a model until every agent has a workload and capability profile.

### 2. Build a current ledger for the user's model pool

Use `references/model-sources.md` and verify current data before recommending assignments. Start with Models.dev as the primary cross-provider catalog, then verify provider-route details when needed.

For every serious candidate, capture:

- exact provider/model ID
- available variants or reasoning-effort levels
- context and output limits
- supported input modalities
- tool/function calling and structured-output support
- other role-relevant capabilities such as browsing, code execution, or prompt caching
- input, cached-input, cache-write, and output pricing when applicable
- subscription credits, quotas, or included usage for the actual route
- latency or throughput when it materially affects the role
- benchmark score, benchmark version, harness, effort level, date, cost per task, output tokens, and agent steps when available

Treat the provider route as part of the model choice. The same underlying model can have different context limits, controls, prices, caches, quotas, or availability through different routes.

### 3. Match evidence to the role

Use these as starting signals, then adapt them to the actual agent prompt and required capabilities:

| Role             | Prioritize                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| chat             | latency, cost, instruction following, required modalities, adequate context                                                   |
| explore          | context, cached-input economics, tool reliability, speed, low output overhead                                                 |
| lead             | general intelligence, judgment, delegation reliability, tool orchestration, long-context synthesis, high-leverage correctness |
| plan             | reasoning, architecture/problem decomposition, context, tool-use reliability, cost if invoked often                           |
| code             | coding-agent results, long-horizon repo work, terminal/tool performance, edit reliability, cost per solved task               |
| review           | code comprehension, terminal validation, security/correctness signal, context, report efficiency, tool reliability            |
| research         | factual calibration, synthesis, browsing/search behavior, context, source discipline, required document/image modalities      |
| default/fallback | broad capability, predictable behavior, adequate context, reliable tool use, sustainable cost                                 |

The default model is not inherently the smallest or cheapest model. It should be the safest broad fallback for work that is not explicitly routed elsewhere.

Do not let a product name substitute for evidence. A model marketed for coding still has to beat general models on the workload that matters.

### 4. Apply hard capability filters before ranking intelligence

Remove candidates that fail a role's non-negotiable requirements, for example:

- cannot accept image input when the agent inspects screenshots
- cannot call tools when the workflow depends on tool execution
- context is too small for expected repository or document loads
- structured output is required but unreliable or unsupported
- the provider route omits a capability available elsewhere for the same model

Then rank the remaining candidates on role-relevant quality and economics.

This prevents a higher benchmark score from masking an unusable capability mismatch.

### 5. Compare cost per successful task, not token price

Raw price per million tokens is only an input.

Estimate task cost from the workload mix:

`task_cost = input + cached_input + cache_write + output + other metered reasoning/tool costs`

Then prefer observed economics:

`cost_per_success = total_cost / successful_tasks`

For subscriptions or quota plans, replace dollar cost with credit/quota depletion when that is the binding constraint.

Account for output verbosity, reasoning tokens, cached reads, tool steps, retries, escalations, and wall time. A model with cheaper token rates can still be more expensive per task if it reasons longer, emits more output, or needs more attempts.

Actual usage telemetry outranks estimated list-price economics when the workloads are comparable. Normalize telemetry by role, task class, variant, and success before drawing conclusions.

### 6. Put candidates on a role-specific Pareto frontier

Do not rank models by one global score. Remove a candidate when another eligible model is at least as good for the role while also cheaper, faster, more context-capable, more quota-efficient, or better matched to required capabilities.

Keep premium models where errors have high downstream cost. Spend cheaper models on frequent, bounded work.

Typical routing pattern:

- strongest judgment model for lead and difficult planning
- efficient long-context/tool-capable model for exploration and routine research
- coding-efficient model for bounded implementation
- strong, preferably independent model for review when the quality gain justifies the cost

Model-family diversity between code and review is a useful tiebreaker because it can reduce correlated blind spots, but it is not worth a large capability, quality, or cost regression by itself.

### 7. Treat effort/variant as part of the model choice

Compare `model + variant`, not just model family.

- `medium` or `high` is often the stable default for reasoning roles.
- `max`/`xhigh` belongs where benchmark or local-eval gains justify the additional tokens, latency, or quota.
- For a frequent worker, a cheaper model at higher effort can beat a premium model at lower effort.
- Leave temperature at provider defaults unless an eval demonstrates a reason to override it. Reasoning effort is usually the more important control for engineering agents.

Variants can also alter capability availability or effective context on some routes. Verify the exact route rather than assuming variants differ only in reasoning budget.

### 8. Build presets around distinct user intents

Each preset needs a clear optimization target derived from the user's available model pool. Common branches:

- **provider-scoped**: best role-fit choices from one requested provider or route
- **subscription-scoped**: maximize included plan value while managing credit/quota burn
- **quality-focused**: maximize workflow quality without wasting premium calls on low-leverage work
- **lean**: reduce cost or quota burn while preserving strong decisions, execution, and validation
- **capability-scoped**: route around modality, context, tool, privacy, or deployment constraints

A lean preset should degrade gracefully, not simply choose the cheapest model everywhere. Lower high-volume workers first; preserve capability where one mistake can fan out across the workflow.

Do not invent provider boundaries the user did not ask for. A preset can mix any providers in the supplied pool when the routes and capabilities permit it.

### 9. Validate before locking the preset

Before returning a recommendation:

- verify every model exists in the current catalog or user-provided route
- verify every variant is valid on the exact provider route
- verify required modalities and tool capabilities for each assigned role
- check context/output limits against expected workload
- compare benchmark results from the same version and harness when possible
- label vendor benchmarks as vendor-run and independent benchmarks as independent
- flag cross-harness comparisons as weak evidence
- check the preset against the target schema/config format
- identify any choice based mainly on inference because evidence is missing

A preset is ready when every assignment has a role-fit reason, a capability reason where relevant, an economics reason, and current evidence.

## Benchmark interpretation

Read `references/benchmarks.md` for benchmark sources and interpretation rules.

Prefer benchmarks that resemble the role. Do not average unrelated benchmarks into a fake universal score unless the methodology explicitly supports that use.

Review quality is especially under-benchmarked. Use coding, terminal, security, repository-understanding, and knowledge-work evidence as proxies, then prefer a local review eval that measures true findings, false positives, missed defects, review cost, and report length.

## Lessons to preserve

- Role fit beats global model rank.
- Capability fit comes before benchmark rank.
- Required modalities and tool use can disqualify an otherwise stronger model.
- The default model should be a safe broad fallback, not automatically the cheapest model.
- Cost per token is not cost per task.
- Cost per task is not cost per successful task.
- Output and reasoning-token efficiency can reverse nominal price advantages.
- Long context matters most for roles that actually consume it.
- A premium reviewer can be economical if it needs fewer steps or produces fewer failed reviews.
- A cheap implementation model can be appropriate when the implementation prompt is already surgical.
- Subscription plans change the objective from API spend to quota/credit efficiency.
- Effort level can move a model enough to change the Pareto frontier.
- Benchmark harness, version, date, and variant are part of the score.
- User telemetry should override generic assumptions when it measures the same workload.
- New models enter as challengers, not defaults, until current independent or local evidence supports the swap.
- Provider diversity is a means, not a goal. Use it only when it improves the workflow frontier.

## Output contract

When asked for recommendations, return only what the user needs, usually:

1. the preset assignments with exact `provider/model` and variant
2. a short rationale for contested or surprising choices
3. important cost/quota/capability assumptions
4. weak-evidence areas that should be evaluated locally

When the user asks for JSON only, return JSON only.
