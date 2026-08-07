# Evidence rules

These rules are required after the Step 4 gate in `SKILL.md` and govern both attribution and reporting.

## Levels and classifications

Classify each finding as one of the following:

- **Explicit speaker**: a transcript identifies the speaker and states the relevant point.
- **Other speaker**: an identified speaker states the point, but is not the requested person.
- **Notes-only**: a note records the point without transcript-level speaker evidence.
- **Inference**: a conclusion drawn from evidence rather than directly stated; name the supporting sources.

## Attribution and timestamps

- Attribute words only to an explicitly named transcript speaker.
- Preserve the source timestamp when present; otherwise identify the source as undated.
- Keep quotes short and adjacent to their source, speaker state, and timestamp.
- Treat anonymous, null, and note authorship as unattributed unless the evidence itself identifies the speaker.
- Retain a transcript's stated speaker identity when it appears erroneous; describe the uncertainty instead of correcting it.

## Evidence states

- **Missing**: the expected asset was not returned or cannot be located.
- **Empty**: the retrieved asset contains no relevant usable content.
- **Inaccessible**: retrieval was denied or failed; record the route and failure state.
- **Conflicting**: sources make incompatible claims; present each source and do not silently choose one.

Search all available transcript, note, and document evidence before assigning an absence state. Keep unavailable
evidence distinct from evidence that was searched without a match.

## Safe wording

- “I found no match for `<term>` in the available transcript, notes, and documents searched.”
- “I could not verify this because `<asset>` was inaccessible or unavailable.”
- “The notes record `<point>`, but they do not identify a speaker.”
- “The transcript labels this statement as `<speaker>`; that identity may be a transcription error.”
- “This is an inference from `<sources>`, not an explicit statement.”
