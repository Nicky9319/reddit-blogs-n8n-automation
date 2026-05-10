# Reddit URL Intake Configuration

Workflow: `Reddit URL Intake`

Workflow ID: `t4dtPCOhjDWkKMv3`

Purpose:
- Show a form when the workflow runs.
- Accept a Reddit URL or short link.
- Validate and normalize the URL.
- Fetch the Reddit JSON endpoint to confirm the URL is reachable.
- Build the Airtable payload for the `Threads` table.
- Create the record in Airtable.

## Input Test URL

Use this URL for testing:

`https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/`

Short-form and protocol-less variants should also be accepted:

- `//www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/`
- `www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/`
- `redd.it/1i3yra1`

## Node 1: Reddit URL Intake Form

Type:
- `n8n-nodes-base.formTrigger`

Version:
- `2.5`

Name:
- `Reddit URL Intake Form`

Key parameters:
- `formTitle`: `Reddit URL Intake`
- `formDescription`: `<p>Paste a Reddit thread URL or short link to create the initial Threads record.</p>`
- `formFields.values[0]`
  - `fieldType`: `text`
  - `fieldName`: `reddit_url`
  - `fieldLabel`: `Reddit URL`
  - `placeholder`: `https://www.reddit.com/r/entrepreneur/comments/abc123/example/`
  - `requiredField`: `true`
- `responseMode`: `onReceived`
- `options.appendAttribution`: `false`
- `options.buttonLabel`: `Submit Reddit URL`
- `options.path`: `reddit-url-intake`
- `options.respondWithOptions.values.respondWith`: `text`
- `options.respondWithOptions.values.formSubmittedText`: `Your Reddit URL was received and is being validated.`

Expected output shape:

```json
{
  "reddit_url": "https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/"
}
```

## Node 2: Validate and Normalize URL

Type:
- `n8n-nodes-base.code`

Version:
- `2`

Mode:
- `runOnceForAllItems`

Language:
- `javaScript`

Purpose:
- Read `reddit_url` from the form payload.
- Accept `reddit_url`, `redditUrl`, `redditURL`, `formData.reddit_url`, `body.reddit_url`, and the literal `Reddit URL` key.
- Normalize URLs that begin with `//`.
- Add `https://` if no scheme exists.
- Extract:
  - `subreddit`
  - `postId`
- Build:
  - `redditFetchUrl`: `https://www.reddit.com/comments/<postId>.json?raw_json=1`

Expected output shape:

```json
{
  "reddit_url": "https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/",
  "postId": "1i3yra1",
  "inputSubreddit": "Fitness_India",
  "redditFetchUrl": "https://www.reddit.com/comments/1i3yra1.json?raw_json=1",
  "validatedAt": "2026-04-30T17:00:00.000Z"
}
```

## Node 3: Fetch Reddit JSON

Type:
- `n8n-nodes-base.httpRequest`

Version:
- `4.4`

Name:
- `Fetch Reddit JSON`

Key parameters:
- `method`: `GET`
- `url`: `={{ $json.redditFetchUrl }}`
- `response.response.fullResponse`: `true`
- `response.response.neverError`: `true`
- `response.response.responseFormat`: `json`
- `timeout`: `30000`

Purpose:
- Verify the Reddit endpoint is reachable.
- Keep the workflow moving even when the response is not 2xx so the next node can decide what to do.

Expected output shape:

```json
{
  "statusCode": 200,
  "body": [
    {
      "data": {
        "children": [
          {
            "data": {
              "id": "1i3yra1",
              "subreddit": "Fitness_India",
              "title": "Which oats with protein",
              "author": "example_author"
            }
          }
        ]
      }
    }
  ]
}
```

## Node 4: Build Airtable Record

Type:
- `n8n-nodes-base.code`

Version:
- `2`

Mode:
- `runOnceForAllItems`

Language:
- `javaScript`

Purpose:
- Extract the Reddit post from the JSON payload.
- Build the Airtable-ready `Threads` object.
- Set `Status` to `Pending Fetch`.
- Populate timestamps.

Expected output shape:

```json
{
  "Thread ID": "Fitness_India_1i3yra1",
  "Reddit URL": "https://www.reddit.com/r/Fitness_India/comments/1i3yra1/",
  "Subreddit": "Fitness_India",
  "Status": "Pending Fetch",
  "JSON Drive Link": "",
  "Current Batch": 0,
  "Total Batches": 0,
  "Final Summary": "",
  "Created At": "2026-04-30T17:00:00.000Z",
  "Updated At": "2026-04-30T17:00:00.000Z"
}
```

## Node 5: Create Thread Record

Type:
- `n8n-nodes-base.airtable`

Version:
- `2.2`

Name:
- `Create Thread Record`

Credentials:
- `airtableTokenApi`
- Saved credential label: `Airtable`

Base:
- `Prustlr Dev Testing`  
- Base ID: `appRFeIVD7Ga2Sl4P`

Table:
- `Threads`  
- Table ID: `tblrWZMgpcR1zRlmg`

Key parameters:
- `resource`: `record`
- `operation`: `create`
- `authentication`: `airtableTokenApi`
- `columns`: `={{ JSON.stringify({ mappingMode: "autoMapInputData", value: {} }) }}`
- `options.typecast`: `true`

Purpose:
- Auto-map the keys from the previous node into Airtable columns.

## Current Workflow Wiring

1. `Reddit URL Intake Form`
2. `Validate and Normalize URL`
3. `Fetch Reddit JSON`
4. `Build Airtable Record`
5. `Create Thread Record`

## What Was Fixed

- Added the form trigger so the workflow opens with a visible URL input.
- Updated the parser to accept URLs starting with `//`.
- Kept short-link support and no-scheme support.
- Preserved Airtable auto-mapping for the `Threads` row.

## Manual Test Checklist

1. Open the form and paste:
   - `https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/`
2. Confirm the validate step emits:
   - `postId = 1i3yra1`
   - `redditFetchUrl = https://www.reddit.com/comments/1i3yra1.json?raw_json=1`
3. Confirm the fetch step returns a 200 response or at least a parsed response body.
4. Confirm the Airtable payload includes all `Threads` fields.
5. Confirm the record appears in Airtable.

## Notes For Later Expansion

Add future node configs here as the automation grows:

- Reddit fetch and raw JSON storage
- Google Drive folder layout
- Chunk processing
- Idea extraction
- Airtable update workflow
- Retry and dead-letter handling
