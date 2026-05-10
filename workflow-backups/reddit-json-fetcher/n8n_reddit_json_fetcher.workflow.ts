import { workflow, trigger, node, newCredential, expr } from '@n8n/workflow-sdk';

const fetchPendingThreads = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Fetch Pending Threads',
    parameters: {
      rule: {
        interval: [
          {
            field: 'minutes',
            minutesInterval: 5,
          },
        ],
      },
    },
    position: [0, 240],
  },
  output: [{}],
});

const findPendingThreads = node({
  type: 'n8n-nodes-base.airtable',
  version: 2.2,
  credentials: {
    airtableTokenApi: newCredential('Airtable Personal Access Token account'),
  },
  config: {
    name: 'Find Pending Threads',
    parameters: {
      resource: 'record',
      operation: 'search',
      authentication: 'airtableTokenApi',
      base: {
        __rl: true,
        mode: 'id',
        value: 'appRFeIVD7Ga2Sl4P',
      },
      table: {
        __rl: true,
        mode: 'id',
        value: 'tblrWZMgpcR1zRlmg',
      },
      filterByFormula: '{Status} = "Pending Fetch"',
      returnAll: false,
      limit: 1,
      options: {},
      sort: {
        property: [
          {
            field: 'Created At',
            direction: 'asc',
          },
        ],
      },
    },
    position: [260, 240],
  },
  output: [
    {
      id: 'recXXXXXXXXXXXXXX',
      fields: {
        'Thread ID': 'Fitness_India_1i3yra1',
        'Reddit URL': 'https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/',
        Subreddit: 'Fitness_India',
        Status: 'Pending Fetch',
      },
    },
  ],
});

const normalizePendingThread = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize Pending Thread',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const record = $input.first().json;
const fields = record.fields ?? record;

function parseRedditUrl(rawUrl) {
  const cleanedUrl = String(rawUrl || '').trim();
  let normalizedUrl = cleanedUrl;

  if (normalizedUrl.startsWith('//')) {
    normalizedUrl = 'https:' + normalizedUrl;
  }

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const schemeSeparatorIndex = normalizedUrl.indexOf('://');
  if (schemeSeparatorIndex < 0) {
    throw new Error('Invalid Reddit URL: ' + rawUrl);
  }

  const withoutScheme = normalizedUrl.slice(schemeSeparatorIndex + 3);
  const pathStartIndex = withoutScheme.indexOf('/');
  let host = pathStartIndex >= 0 ? withoutScheme.slice(0, pathStartIndex) : withoutScheme;
  const path = pathStartIndex >= 0 ? withoutScheme.slice(pathStartIndex) : '';

  host = host.toLowerCase();
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  const segments = path.split('/').filter(Boolean);
  let postId = '';

  if (host === 'redd.it') {
    postId = segments[0] || '';
  } else if (host.endsWith('reddit.com')) {
    const commentsIndex = segments.indexOf('comments');
    if (commentsIndex >= 0) {
      postId = segments[commentsIndex + 1] || '';
    } else if (segments[0] === 'comments') {
      postId = segments[1] || '';
    }
  }

  if (!postId) {
    throw new Error('Could not extract a Reddit post ID from: ' + rawUrl);
  }

  return {
    normalized_url: normalizedUrl,
    post_id: postId,
    reddit_fetch_url: 'https://www.reddit.com/comments/' + postId + '.json?raw_json=1',
  };
}

const redditUrl = String(fields['Reddit URL'] ?? fields.reddit_url ?? '').trim();
const parsed = parseRedditUrl(redditUrl);
const threadId = String(fields['Thread ID'] ?? fields.thread_id ?? parsed.post_id).trim();

if (!record.id || !threadId || !redditUrl) {
  throw new Error('Pending thread is missing record ID, Thread ID, or Reddit URL.');
}

return [
  {
    json: {
      airtable_record_id: record.id,
      thread_id: threadId,
      reddit_url: parsed.normalized_url,
      subreddit: String(fields.Subreddit ?? fields.subreddit ?? '').trim(),
      post_id: parsed.post_id,
      reddit_fetch_url: parsed.reddit_fetch_url,
      updated_at: new Date().toISOString(),
    },
  },
];
      `,
    },
    position: [520, 240],
  },
  output: [
    {
      airtable_record_id: 'recXXXXXXXXXXXXXX',
      thread_id: 'Fitness_India_1i3yra1',
      reddit_url: 'https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/',
      subreddit: 'Fitness_India',
      post_id: '1i3yra1',
      reddit_fetch_url: 'https://www.reddit.com/comments/1i3yra1.json?raw_json=1',
      updated_at: '2026-04-30T17:00:00.000Z',
    },
  ],
});

const fetchRedditJson = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Fetch Reddit JSON',
    parameters: {
      method: 'GET',
      url: expr('{{ $("Normalize Pending Thread").item.json.reddit_fetch_url }}'),
      options: {
        timeout: 30000,
        response: {
          response: {
            fullResponse: true,
            neverError: true,
            responseFormat: 'json',
          },
        },
      },
    },
    position: [780, 240],
  },
  output: [
    {
      statusCode: 200,
      body: [
        {
          data: {
            children: [
              {
                data: {
                  id: '1i3yra1',
                  subreddit: 'Fitness_India',
                  title: 'Which oats with protein?',
                  selftext: 'Example body',
                  author: 'example_author',
                  num_comments: 12,
                },
              },
            ],
          },
        },
        {
          data: {
            children: [],
          },
        },
      ],
    },
  ],
});

const prepareRawJsonAttachment = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Raw JSON Attachment',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const response = $input.first().json;
const thread = $('Normalize Pending Thread').item.json;
const statusCode = response.statusCode ?? response.status ?? 200;

if (statusCode < 200 || statusCode >= 300) {
  throw new Error('Reddit fetch failed with status ' + statusCode);
}

let reddit = response.body ?? response;
if (!Array.isArray(reddit)) {
  const allItems = $input.all().map((item) => item.json);
  if (allItems.length > 1 && allItems.every((item) => item.kind === 'Listing')) {
    reddit = allItems;
  }
}

if (!Array.isArray(reddit)) {
  throw new Error('Reddit response was not the expected listing array.');
}

const post = reddit?.[0]?.data?.children?.[0]?.data ?? {};
const subreddit = String(post.subreddit ?? thread.subreddit ?? '').trim();
const rawJsonText = JSON.stringify(reddit, null, 2);
const rawJsonBase64 = Buffer.from(rawJsonText, 'utf8').toString('base64');
const now = new Date().toISOString();

return [
  {
    json: {
      airtable_record_id: thread.airtable_record_id,
      thread_id: thread.thread_id,
      reddit_url: thread.reddit_url,
      subreddit,
      title: String(post.title ?? ''),
      author: String(post.author ?? ''),
      post_id: String(post.id ?? thread.post_id ?? ''),
      comment_count: Number(post.num_comments ?? 0),
      raw_json_base64: rawJsonBase64,
      raw_json_filename: thread.thread_id + '_reddit_raw.json',
      updated_at: now,
    },
  },
];
      `,
    },
    position: [1040, 240],
  },
  output: [
    {
      airtable_record_id: 'recXXXXXXXXXXXXXX',
      thread_id: 'Fitness_India_1i3yra1',
      reddit_url: 'https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/',
      subreddit: 'Fitness_India',
      title: 'Which oats with protein?',
      author: 'example_author',
      post_id: '1i3yra1',
      comment_count: 12,
      raw_json_base64: 'W10=',
      raw_json_filename: 'Fitness_India_1i3yra1_reddit_raw.json',
      updated_at: '2026-04-30T17:00:00.000Z',
    },
  ],
});

const uploadRawJsonAttachment = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  credentials: {
    airtableTokenApi: newCredential('Airtable Personal Access Token account'),
  },
  config: {
    name: 'Upload Raw JSON Attachment',
    parameters: {
      method: 'POST',
      url: expr('https://content.airtable.com/v0/appRFeIVD7Ga2Sl4P/{{ $json.airtable_record_id }}/Raw%20JSON/uploadAttachment'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'airtableTokenApi',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'Accept',
            value: 'application/json',
          },
          {
            name: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { file: $json.raw_json_base64, filename: $json.raw_json_filename, contentType: "application/json" } }}'),
      options: {
        timeout: 30000,
        response: {
          response: {
            fullResponse: true,
            neverError: true,
            responseFormat: 'json',
          },
        },
      },
    },
    position: [1300, 240],
  },
  output: [
    {
      statusCode: 200,
      body: {
        id: 'recXXXXXXXXXXXXXX',
      },
    },
  ],
});

const validateUploadResponse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Upload Response',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const response = $input.first().json;
const thread = $('Prepare Raw JSON Attachment').item.json;
const statusCode = response.statusCode ?? response.status ?? 200;

if (statusCode < 200 || statusCode >= 300) {
  throw new Error('Raw JSON attachment upload failed with status ' + statusCode);
}

return [
  {
    json: {
      ...thread,
      upload_status: statusCode,
    },
  },
];
      `,
    },
    position: [1560, 240],
  },
  output: [
    {
      airtable_record_id: 'recXXXXXXXXXXXXXX',
      thread_id: 'Fitness_India_1i3yra1',
      reddit_url: 'https://www.reddit.com/r/Fitness_India/comments/1i3yra1/which_oats_with_protein/',
      subreddit: 'Fitness_India',
      title: 'Which oats with protein?',
      updated_at: '2026-04-30T17:00:00.000Z',
      upload_status: 200,
    },
  ],
});

const updateThreadRecord = node({
  type: 'n8n-nodes-base.airtable',
  version: 2.2,
  credentials: {
    airtableTokenApi: newCredential('Airtable Personal Access Token account'),
  },
  config: {
    name: 'Update Thread Record',
    parameters: {
      resource: 'record',
      operation: 'update',
      authentication: 'airtableTokenApi',
      base: {
        __rl: true,
        mode: 'id',
        value: 'appRFeIVD7Ga2Sl4P',
      },
      table: {
        __rl: true,
        mode: 'id',
        value: 'tblrWZMgpcR1zRlmg',
      },
      columns: {
        mappingMode: 'defineBelow',
        matchingColumns: ['id'],
        value: {
          id: '={{ $json.airtable_record_id }}',
          'Thread ID': '={{ $json.thread_id }}',
          'Reddit URL': '={{ $json.reddit_url }}',
          Subreddit: '={{ $json.subreddit }}',
          Title: '={{ $json.title }}',
          Status: 'Ready for Processing',
          'Updated At': '={{ $json.updated_at }}',
        },
      },
      options: {
        typecast: true,
      },
    },
    position: [1820, 240],
  },
  output: [
    {
      id: 'recXXXXXXXXXXXXXX',
      fields: {
        Status: 'Ready for Processing',
      },
    },
  ],
});

export default workflow('WcdEfSFzLTTwEehD', 'Reddit JSON Fetcher')
  .add(fetchPendingThreads)
  .to(findPendingThreads)
  .to(normalizePendingThread)
  .to(fetchRedditJson)
  .to(prepareRawJsonAttachment)
  .to(uploadRawJsonAttachment)
  .to(validateUploadResponse)
  .to(updateThreadRecord);
