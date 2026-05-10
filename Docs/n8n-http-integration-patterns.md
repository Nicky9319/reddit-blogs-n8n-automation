# n8n HTTP Integration Patterns

Use this when a workflow depends on HTTP Request nodes for external APIs or non-native platform endpoints.

## What Worked

- Letting the HTTP node return full responses made status-code handling explicit.
- Using `neverError` pushed error handling into workflow logic instead of stopping execution too early.
- Adding a code-node validation step after the HTTP call made failures easier to localize.

## Recommended Pattern

1. Make the HTTP call.
2. Capture the full response, including status code.
3. Validate the response in a dedicated code node.
4. Only then pass the normalized payload to downstream nodes.

## Why This Helps

- You get stable branching around non-200 responses.
- You can emit better workflow errors than the raw connector error.
- You keep parsing logic separate from transport logic.

## Common Failure Modes

- Relying on the default HTTP node failure behavior and losing the response body.
- Mixing fetch, parse, and state updates in one node.
- Assuming credential wiring behaves the same across native nodes and raw HTTP nodes.

## Transferable Rule

- Treat HTTP Request nodes as transport only; validate and normalize in separate nodes.
