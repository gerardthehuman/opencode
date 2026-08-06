# Tool routing

Use the live Forge tool definitions for exact arguments, response fields, schemas, and authentication behaviour.

| Intent                                        | Route                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Find meetings                                 | Use unified Zoom Search. For a general meeting request, search `zoom_meeting` and `calendar`.           |
| Search metadata                               | Discover the datasource schema first, then submit only supported metadata filters.                      |
| Unified Search returns 401                    | Use legacy meeting search with the supplied user query.                                                 |
| Traverse a result set                         | Continue with the returned pagination token until no further accessible page remains.                   |
| Recurring meeting evidence                    | Retrieve assets using the selected occurrence UUID rather than a recurring meeting number.              |
| Meeting-level materials                       | Use Get Meeting Assets for summaries, My Notes, documents, participants, recordings, and linked assets. |
| Recording content or playback                 | Use Get Recording Resource after identifying the meeting occurrence and recording need.                 |
| Returned My Notes `noteId`                    | Use the My Notes content tool. Include a transcript when meeting evidence requires it.                  |
| Returned document reference                   | Treat `file_id`, `file_link`, and Hub URLs as Hub document references. Prefer Hub file retrieval.       |
| Hub cannot serve a document reference         | Use deprecated Canvas export only as a fallback. Record any remaining access failure.                   |
| Workspace-wide documents                      | Use unified Search scoped to `zoom_canvas` for records, or Ask for an evidence-backed synthesis.        |
| Workspace search cannot retrieve a known file | Use Hub file retrieval for the known document reference; otherwise record the access failure.           |

Choose the least broad route that answers the request, and retain the returned identifiers needed for later evidence retrieval.
