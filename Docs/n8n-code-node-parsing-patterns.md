# n8n Code Node Parsing Patterns

Use this for data normalization and light parsing inside n8n code nodes.

## What Worked

- Plain string operations were more reliable than regex-heavy or library-heavy parsing in the tested n8n code node.
- For URLs, a simple normalization flow is usually enough:
  - trim whitespace
  - convert `//example.com/...` into `https://example.com/...`
  - add `https://` if no scheme exists
- Parsing the URL path manually was more robust than depending on `URL()` in the tested environment.

## Recommended Parsing Approach

- Normalize the string first.
- Split the host from the path using `://` and `/`.
- Lowercase the host and strip `www.` when needed.
- Use path segments to extract identifiers.
- Return a compact object with only the fields the next node needs.

## Common Failure Modes

- Regex literals can become fragile in some editor/runtime paths.
- Template literals inside generated code can create escaping issues when the workflow is stored or re-synced.
- `URL()` can fail in sandboxed or generated contexts even when the logic looks correct.

## Transferable Rule

- Prefer simple deterministic parsing in code nodes. If the logic needs complex branching, consider a dedicated node or split the work into smaller nodes.

