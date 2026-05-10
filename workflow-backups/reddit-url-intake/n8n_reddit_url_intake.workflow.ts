import { workflow, trigger, node, newCredential, expr } from '@n8n/workflow-sdk';

const redditUrlIntakeForm = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.5,
  config: {
    name: 'Reddit URL Intake Form',
    parameters: {
      formTitle: 'Reddit URL Intake',
      formDescription: '<p>Paste a Reddit thread URL or short link to create the initial Threads record.</p>',
      formFields: {
        values: [
          {
            fieldType: 'text',
            fieldName: 'reddit_url',
            fieldLabel: 'Reddit URL',
            placeholder: 'https://www.reddit.com/r/entrepreneur/comments/abc123/example/',
            requiredField: true,
          },
        ],
      },
      responseMode: 'onReceived',
      options: {
        appendAttribution: false,
        buttonLabel: 'Submit Reddit URL',
        path: 'reddit-url-intake',
        respondWithOptions: {
          values: {
            respondWith: 'text',
            formSubmittedText: 'Your Reddit URL was received and is being validated.',
          },
        },
      },
    },
    position: [240, 300],
  },
  output: [
    {
      reddit_url: 'https://www.reddit.com/r/entrepreneur/comments/abc123/example/',
    },
  ],
});

const validateAndNormalizeUrl = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate and Normalize URL',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const input = $input.first().json;

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function parseRedditUrl(rawUrl) {
  const cleanedUrl = String(rawUrl).trim();
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

  let subreddit = '';
  let postId = '';

  if (host === 'redd.it') {
    postId = segments[0] || '';
  } else if (host.endsWith('reddit.com')) {
    const commentsIndex = segments.indexOf('comments');

    if (commentsIndex >= 0) {
      subreddit = segments[1] || '';
      postId = segments[commentsIndex + 1] || '';
    } else if (segments[0] === 'comments') {
      postId = segments[1] || '';
    }
  }

  if (!postId) {
    throw new Error('Could not extract a Reddit post ID from: ' + rawUrl);
  }

  return {
    subreddit,
    postId,
    redditFetchUrl: 'https://www.reddit.com/comments/' + postId + '.json?raw_json=1',
  };
}

const submittedUrl = firstString(
  input.reddit_url,
  input.redditUrl,
  input.redditURL,
  input.formData?.reddit_url,
  input.formData?.redditUrl,
  input.body?.reddit_url,
  input.body?.redditUrl,
  input['Reddit URL'],
);

if (!submittedUrl) {
  throw new Error('Reddit URL is required.');
}

const parsed = parseRedditUrl(submittedUrl);

return [
  {
    json: {
      reddit_url: submittedUrl,
      postId: parsed.postId,
      inputSubreddit: parsed.subreddit,
      redditFetchUrl: parsed.redditFetchUrl,
      validatedAt: new Date().toISOString(),
    },
  },
];
      `,
    },
    position: [540, 300],
  },
  output: [
    {
      reddit_url: 'https://www.reddit.com/r/entrepreneur/comments/abc123/example/',
      postId: 'abc123',
      inputSubreddit: 'entrepreneur',
      redditFetchUrl: 'https://www.reddit.com/comments/abc123.json?raw_json=1',
      validatedAt: '2026-04-30T16:55:09.983Z',
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
      url: expr('{{ $json.redditFetchUrl }}'),
      response: {
        response: {
          fullResponse: true,
          neverError: true,
          responseFormat: 'json',
        },
      },
      timeout: 30000,
    },
    position: [840, 300],
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
                  id: 'abc123',
                  subreddit: 'entrepreneur',
                  title: 'Example thread',
                  author: 'example_author',
                  num_comments: 42,
                },
              },
            ],
          },
        },
      ],
    },
  ],
});

const buildAirtableRecord = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Airtable Record',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const response = $input.first().json;
const statusCode = response.statusCode ?? response.status ?? 200;

if (statusCode < 200 || statusCode >= 300) {
  throw new Error('Reddit fetch failed with status ' + statusCode);
}

const payload = response.body ?? response;
const listing = Array.isArray(payload) ? payload : payload?.body ?? payload;

let post = null;

if (Array.isArray(listing)) {
  post = listing[0]?.data?.children?.[0]?.data ?? null;
} else {
  post = listing?.data?.children?.[0]?.data ?? null;
}

if (!post?.id) {
  throw new Error('Could not parse Reddit post data from the fetched JSON.');
}

const subreddit = post.subreddit || '';

if (!subreddit) {
  throw new Error('Could not determine the subreddit from the Reddit response.');
}

const threadId = subreddit + '_' + post.id;
const now = new Date().toISOString();

return [
  {
    json: {
      'Thread ID': threadId,
      'Reddit URL': 'https://www.reddit.com/r/' + subreddit + '/comments/' + post.id + '/',
      'Subreddit': subreddit,
      'Status': 'Pending Fetch',
      'Current Batch': 0,
      'Total Batches': 0,
      'Final Summary': '',
      'Created At': now,
      'Updated At': now,
    },
  },
];
      `,
    },
    position: [1140, 300],
  },
  output: [
    {
      'Thread ID': 'entrepreneur_abc123',
      'Reddit URL': 'https://www.reddit.com/r/entrepreneur/comments/abc123/',
      'Subreddit': 'entrepreneur',
      'Status': 'Pending Fetch',
      'Current Batch': 0,
      'Total Batches': 0,
      'Final Summary': '',
      'Created At': '2026-04-30T16:55:09.983Z',
      'Updated At': '2026-04-30T16:55:09.983Z',
    },
  ],
});

const createThreadRecord = node({
  type: 'n8n-nodes-base.airtable',
  version: 2.2,
  credentials: {
    airtableTokenApi: newCredential('Airtable'),
  },
  config: {
    name: 'Create Thread Record',
    parameters: {
      resource: 'record',
      operation: 'create',
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
        mappingMode: 'autoMapInputData',
        value: {},
      },
      options: {
        typecast: true,
      },
    },
    position: [1440, 300],
  },
  output: [
    {
      id: 'rec123abc',
    },
  ],
});

export default workflow('t4dtPCOhjDWkKMv3', 'Reddit URL Intake')
  .add(redditUrlIntakeForm)
  .to(validateAndNormalizeUrl)
  .to(fetchRedditJson)
  .to(buildAirtableRecord)
  .to(createThreadRecord);
