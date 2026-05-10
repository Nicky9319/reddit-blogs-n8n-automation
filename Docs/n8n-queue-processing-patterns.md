# n8n Queue Processing Patterns

Use this when a workflow should pick the next Airtable record from a status-based queue and advance it through a controlled lifecycle.

## What Worked

- Using a single status field made each workflow stage explicit.
- Searching Airtable for one queued row at a time reduced duplicate processing risk.
- Sorting by `Created At` ascending gave deterministic oldest-first processing.
- Updating the same record in place preserved a single source of truth for the thread lifecycle.

## Recommended Queue Shape

- Keep one status field on the source table.
- Let each workflow own a narrow status transition.
- Search for one record per run unless parallelism is intentional.
- Sort queued records explicitly instead of relying on Airtable default order.

## Good Lifecycle Design

- `Pending Fetch` -> fetch raw data
- `Ready for Processing` -> analysis can start
- `Processing` -> analysis in flight
- `Ideas Complete` or `Completed` -> downstream work finished
- `Fetch Failed` or `Failed` -> terminal error state

## Common Failure Modes

- Two workflows reading the same status without a clear ownership boundary.
- Using vague statuses like `Pending` for multiple stages.
- Pulling the latest row implicitly instead of sorting a real queue.
- Creating a second record instead of updating the original row.

## Transferable Rule

- Treat Airtable as a queue with explicit state transitions, not as a passive data dump.
