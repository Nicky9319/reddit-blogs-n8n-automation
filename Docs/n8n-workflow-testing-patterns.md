# n8n Workflow Testing Patterns

Use this when verifying a workflow end to end.

## What Worked

- Running a manual execution in n8n exposed the exact node that failed.
- Checking execution data after the run made the failure mode obvious.
- A second live run after fixing the node confirmed the workflow was stable.

## Recommended Testing Sequence

1. Validate the workflow code or node configuration first.
2. Run the workflow with a realistic test payload.
3. Inspect the first failing node only.
4. Fix the smallest broken part.
5. Re-run the same sample input.
6. Confirm the final node completes successfully.

## Useful Checks

- Verify the trigger output shape first.
- Confirm each intermediate node emits the fields the next node expects.
- Check the final integration node separately from the parsing logic.
- Keep a known-good sample input in the docs so future runs are repeatable.

## Transferable Rule

- A workflow is only “done” once it has a successful live execution, not just a validated config.

