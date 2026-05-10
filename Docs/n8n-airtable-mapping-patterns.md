# n8n Airtable Mapping Patterns

Use this when writing records into Airtable from n8n.

## What Worked

- Using Airtable base and table IDs was more reliable than using display names.
- The workflow succeeded once the Airtable node used explicit IDs:
  - Base ID
  - Table ID
- The create operation worked with auto-mapping once the node resolved the correct resource IDs.

## Recommended Airtable Setup

- Resolve the base schema first if names are ambiguous.
- Save the actual base ID and table ID in the workflow docs.
- Prefer explicit IDs in production workflows when the node supports them.

## Common Failure Modes

- A `404 NOT_FOUND` from Airtable often means the node is pointing at the wrong base or table reference.
- A config that works in the UI by name can still fail at runtime if Airtable resolution is ambiguous.
- Credential auto-assignment can succeed while the base/table lookup still fails.

## Transferable Rule

- When Airtable lookups fail, verify the base/table IDs before debugging the field mapping.

