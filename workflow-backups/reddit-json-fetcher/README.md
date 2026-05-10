# Reddit JSON Fetcher Backup

This folder contains the working backup artifacts for the Reddit JSON fetch stage.

## Purpose

This workflow is responsible for one job only:

- find the next Airtable thread row queued for fetch
- fetch the Reddit JSON for that thread
- upload the raw JSON into Airtable as an attachment
- update the same thread row to `Ready for Processing`

## Files

- `Reddit JSON Fetcher.json`
- `n8n_reddit_json_fetcher.workflow.ts`

## Current Live Workflow

- Workflow name: `Reddit JSON Fetcher`
- Workflow ID: `WcdEfSFzLTTwEehD`

## Node Layout

1. `Fetch Pending Threads`
2. `Find Pending Threads`
3. `Normalize Pending Thread`
4. `Fetch Reddit JSON`
5. `Prepare Raw JSON Attachment`
6. `Upload Raw JSON Attachment`
7. `Validate Upload Response`
8. `Update Thread Record`

## Runtime Behavior

- Queue state read: `Status = Pending Fetch`
- Queue order: oldest first by `Created At`
- Output state: `Ready for Processing`
- Record behavior: updates the same Airtable row in place

## Known-Good Airtable Targets

- Base ID: `appRFeIVD7Ga2Sl4P`
- Threads table ID: `tblrWZMgpcR1zRlmg`
- Attachment field: `Raw JSON`

## Important Implementation Detail

- The raw Reddit JSON is converted to base64 only for upload transport.
- Airtable stores the final result as a real `.json` attachment, not as base64 text.

## Credential Note

- Native Airtable nodes use `Airtable Personal Access Token account`.
- The `Upload Raw JSON Attachment` HTTP Request node must also have that credential bound manually in n8n.
