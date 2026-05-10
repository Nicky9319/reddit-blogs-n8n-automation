# n8n Form Intake Patterns

Use this when you want a workflow to start from a user-facing form.

## What Worked

- `n8n-nodes-base.formTrigger` is the right entry point when the user needs to paste a value before execution continues.
- A visible text field with a stable field name is the safest way to capture a URL or short code.
- `responseMode: onReceived` is useful when you want immediate acknowledgement and the downstream nodes can continue independently.

## Recommended Form Shape

- Form title should clearly describe the action.
- The first field should be the only required input when possible.
- Use a stable `fieldName` like `reddit_url` rather than a display label.
- Add a short placeholder showing the expected input format.

## Common Failure Modes

- If `formFields.values` is missing, the form may render without usable inputs.
- If the field name changes between the form and downstream nodes, the workflow may appear to work but fail to pass data.
- If the form submission payload is not normalized, downstream code should check multiple input shapes.

## Transferable Rule

- Treat form field names as part of the workflow API. Keep them stable and document them.

