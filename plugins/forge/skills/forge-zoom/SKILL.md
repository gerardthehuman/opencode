---
name: forge-zoom
description: Find Zoom meetings, transcripts, My Notes, Zoom Docs, recordings, speaker evidence, and
  meeting-derived requirements or actions.
---

# Forge Zoom

Search Zoom and produce evidence-backed results from meeting records, transcripts, My Notes, and documents.

## Workflow

### 1. Define the request

- Capture people, topic, exact terms, related concepts, time scope, and required output fields.
- Use participant matches as discovery leads only; they do not prove that a person spoke.
- Establish the user's timezone before resolving relative or local time filters.
- Complete when the search brief states every requested field and has an explicit timezone or UTC range.

### 2. Discover meetings

- Use unified Zoom Search; for general meeting requests, include both `zoom_meeting` and `calendar`.
- Load `references/tool-routing.md` before applying metadata filters, handling fallbacks, or paging results.
- Record each candidate's UUID, topic, date, attendees, meeting number, permissions, and relevant flags.
- Complete when every accessible candidate and page has a recorded identity and access state.

### 3. Retrieve evidence

- Get meeting assets, preferring the occurrence UUID for a recurring meeting.
- Inspect returned My Notes, transcripts, summaries, recordings, and documents.
- For each `noteId`, document reference, recording, or workspace request, load
  `references/tool-routing.md` and follow its route.
- Record access failures for assets, My Notes, documents, recordings, and workspace search.
- Complete when every returned asset is inspected, retrieved, empty, missing, or inaccessible with its state recorded.

### 4. Search, attribute, and prepare the report

- **Gate:** Load `references/evidence-rules.md` before attributing a finding or drafting any report.
- Search transcripts, notes, and documents for exact terms and related concepts.
- Preserve timestamps and short supporting quotes for each relevant result.
- Apply the loaded evidence rules to attribution, classification, and source states.
- Complete when the gate is met and each finding has its source, classification, and supported attribution recorded.

### 5. Verify and report

- Cross-check sources and surface conflicts rather than reconciling them silently.
- Separate exact hits from paraphrased requirements, and label and cite every inference.
- List empty, missing, and inaccessible assets, distinguishing no match in available evidence from could not verify.
- Report concisely with date, timestamp, speaker, quote, source, and confidence where available.
- Complete when every requested output field is supported, scoped as unavailable, or marked unverified.

## References

- Use `references/tool-routing.md` for tool selection and fallback routes.
- Step 4 requires `references/evidence-rules.md` for evidence levels, attribution, conflicts, and safe wording.

## Completion criteria

The task is complete only when all five workflow completion criteria are satisfied and every limitation is reported.
