# Model Catalog and Cost Sources

Use current sources. Model catalogs, prices, quotas, variants, context limits, modalities, and tool capabilities change quickly.

## Source priority

### 1. Models.dev — primary cross-provider catalog

https://models.dev/

Use Models.dev first to enumerate and normalize the user's candidate pool across providers. It is the primary source for cross-provider model discovery and comparison.

Useful endpoints and views include:

- provider/model IDs
- provider catalogs
- context and output limits
- pricing metadata
- reasoning support
- tool/function calling support
- structured output support
- input modalities and other capabilities when listed

Machine-readable catalog endpoints may include:

- https://models.dev/api.json
- https://models.dev/models.json
- https://models.dev/catalog.json

When the user gives providers rather than exact models, start here and build the candidate ledger before consulting provider-specific pages.

### 2. Provider-route documentation — verify route-specific facts

After Models.dev identifies candidates, use the documentation for the exact route the user will run through to verify details that can differ by provider or product surface:

- actual availability
- exact model/variant IDs
- input and output limits
- reasoning-effort controls
- tool/function calling
- structured output
- image/document/audio inputs
- prompt caching
- regional or deployment restrictions
- rate limits, quotas, credits, or included usage
- route-specific pricing

The same underlying model can differ materially across routes. Treat `provider/model + route + variant` as the deployable unit.

Examples of route documentation include hosted aggregators, direct model labs, cloud platforms, subscription products, and local/self-hosted runtimes. Do not privilege one provider family unless the user's pool requires it.

### 3. Model-lab documentation — capability and release details

Use the model creator's official documentation or release notes when Models.dev or the route provider does not yet expose a new capability, variant, context limit, or modality.

Good uses:

- newly released model or preview availability
- thinking/reasoning effort levels
- modality support
- tool-use format
- context-window changes
- model-specific caching behavior
- official deprecations or replacements

Treat vendor benchmark claims as capability evidence, not independent validation. Benchmark sources belong in `BENCHMARKS.md`.

### 4. User telemetry — actual route economics

For the user's own workflow, capture:

- calls by role/model/variant/provider route
- input, cached-input, cache-write, output, and reasoning tokens
- total cost or quota/credit burn
- wall time and tool/agent steps
- retries and escalations
- failures caused by missing modalities, context, or tool-use errors

Normalize by role and task class. A model used on harder tasks will otherwise look artificially expensive.

When comparable, actual route telemetry outranks theoretical list-price estimates.

## Building the model ledger

For each candidate, record at minimum:

| Field                    | Why it matters                                  |
| ------------------------ | ----------------------------------------------- |
| provider/model ID        | exact configuration target                      |
| route                    | determines availability and economics           |
| variant/effort           | can materially change quality and cost          |
| context limit            | eligibility for large-input roles               |
| output limit             | eligibility for code/report-heavy roles         |
| input modalities         | eligibility for image/document/audio workflows  |
| tool/function calling    | eligibility and reliability for agent workflows |
| structured output        | useful for schema-bound agents                  |
| caching                  | changes economics for repeated large context    |
| input/cache/output price | estimate workload cost                          |
| subscription/quota terms | estimate non-API route consumption              |
| latency/throughput       | important for high-frequency workers            |

Do not assume missing metadata means unsupported. Verify with the exact provider route before excluding a model.
