# Benchmark and Evaluation Sources

Use benchmarks as role-specific evidence, not as a single universal ranking. Always record benchmark version, date, harness, model route, and effort/variant when available.

## Source priority

1. Independent benchmarks that resemble the target agent workload.
2. Independent model-evaluation suites for broad intelligence, efficiency, context, or knowledge work.
3. Vendor/model-lab benchmark pages for new releases or variants not yet independently tested.
4. Local evals and normalized user telemetry for the exact prompts, repositories, tools, and routes.

For final preset decisions, local evals can outrank public benchmarks when they measure the same workload reliably.

## Artificial Analysis

https://artificialanalysis.ai/

Use model pages and comparisons for:

- Intelligence Index and component evaluations
- cost per task
- output-token usage and verbosity
- latency and output speed
- context comparisons
- variant/effort comparisons

### Coding Agents

https://artificialanalysis.ai/agents/coding-agents

Use for:

- Coding Agent Index
- component coding benchmarks
- cost per task
- token usage
- execution time
- agent-harness comparisons

Methodology:

https://artificialanalysis.ai/methodology/coding-agents-benchmarking

Always record the harness. Agent harnesses can materially change results, so cross-harness model comparisons are weaker evidence than same-harness comparisons.

## DeepSWE

https://deepswe.datacurve.ai/

Use for long-horizon repository implementation. Consider together:

- success score
- average cost
- output tokens
- agent steps
- benchmark version and harness

Paper:

https://arxiv.org/abs/2607.07946

Prefer same-version, same-harness comparisons.

## Terminal-Bench

https://github.com/harbor-framework/terminal-bench

Use for terminal/tool execution and realistic command-line workflows. It is especially useful for code, review, debugging, and tool-heavy exploration.

Paper:

https://arxiv.org/abs/2601.11868

Check dataset and benchmark version before comparing scores.

## Other role-relevant evidence

Depending on the agent pool and available benchmarks, also seek current evidence for:

- software-engineering task completion
- security or exploit reasoning
- long-context retrieval and synthesis
- factuality and hallucination/calibration
- browsing/search quality
- document or multimodal understanding
- structured-output reliability
- tool-selection and tool-argument accuracy
- knowledge work and complex planning

Prefer evaluations that expose cost, token use, latency, and attempts alongside quality.

## Vendor benchmark pages

Vendor pages are useful for:

- newly released models
- exact effort/variant comparisons
- capabilities not yet covered independently
- official benchmark claims unavailable elsewhere

Mark vendor-run results explicitly. Do not compare a vendor's result against an independent result as if the harness and conditions were identical.

## Local evals

Public leaderboards cannot reproduce the exact agent prompts, repository mix, cache behavior, modalities, and tool harness of a real setup.

Track at least:

- success by role/model/variant
- input, cached-input, output, and reasoning tokens
- total task cost or quota/credit burn
- wall time and tool steps
- retries or escalations
- capability failures such as rejected image/document inputs or malformed tool calls

For review, measure:

- true findings
- false positives
- missed seeded defects
- severity calibration
- validation success
- report length and cost

For research, measure:

- factual accuracy
- citation/source quality
- unsupported claims
- retrieval coverage
- synthesis quality
- cost and wall time

Normalize by task class before comparing models.

## Interpretation rules

- Role fit beats headline score.
- Same benchmark + same version + same harness + same effort is strongest.
- Same benchmark with different harnesses is weaker.
- Different benchmarks are directional evidence, not directly comparable numbers.
- Cost per successful task is more useful than cost per task when failure rates differ.
- Capability mismatches override benchmark advantages.
- New models should enter as challengers until independent or local evidence supports promotion.
