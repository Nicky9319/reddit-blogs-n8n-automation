# n8n Attachment Upload Patterns

Use this when a workflow needs to store generated content in Airtable as a file attachment without relying on Google Drive or another external file host.

## What Worked

- Preparing file content inside a code node made the upload step deterministic.
- Converting JSON text to base64 worked as a transport format for Airtable's attachment upload endpoint.
- Uploading the file to the existing Airtable record kept raw artifacts tied to the source row.

## Recommended Pattern

1. Generate or fetch the content in n8n.
2. Serialize it to text with a stable filename.
3. Convert the text to base64 for transport.
4. Upload it through Airtable's content API to the target attachment field.
5. Validate the upload response before updating downstream status fields.

## Important Distinction

- Base64 is only the request payload format.
- Airtable stores the result as a normal attachment file.
- Downstream workflows should treat the field as an attachment, not as encoded text.

## Credential Behavior

- Native Airtable nodes can use the Airtable PAT credential directly.
- HTTP Request nodes that call Airtable's content API may require the same credential to be bound manually.
- Credential success on one Airtable node does not guarantee the HTTP Request node is configured.

## When To Use This

- Raw JSON snapshots
- Generated markdown or text reports
- Lightweight artifacts that should live with the Airtable record itself

## Common Failure Modes

- Assuming the Airtable node and HTTP Request node share credential binding automatically.
- Storing large raw payloads in long-text fields when attachments are the better fit.
- Skipping upload response validation and marking the record complete too early.

## Transferable Rule

- When the file exists only in n8n memory, direct attachment upload is the cleanest no-Drive pattern.
