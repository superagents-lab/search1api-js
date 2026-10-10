# Search1API TypeScript SDK

Official TypeScript client for Search1API. It supports Node.js 18+ and runtimes
with a standards-compatible `fetch` implementation.

API documentation: [search1api.com/docs](https://s1.dev/docs)

## Install

```bash
npm install @search1api/client
```

## Search

```ts
import { Search1API } from '@search1api/client';

const client = new Search1API({
  apiKey: process.env.SEARCH1API_API_KEY,
});

const response = await client.search('latest AI agent frameworks', {
  maxResults: 10,
  crawlResults: 3,
});

for (const result of response.results) {
  console.log(result.title, result.link);
}
```

The constructor reads `SEARCH1API_API_KEY` when `apiKey` is omitted.

`searchService` selects one engine (`google` by default), for example `bing`,
`bingcn`, `yandex`, `reddit`, `github`, `arxiv`, `wikipedia`, or `grokipedia`.
`page` requests a later results page on engines with native pagination
(`bing`, `bingcn`, `baidu`, `grokipedia`). Results carry `published_date` when the source
exposes one.

CommonJS projects can load the same client with `require`:

```js
const { Search1API } = require('@search1api/client');
```

## Ask

`ask` sends a natural-language request and lets Search1API choose the engines
and time window. It returns at most 10 results ranked by relevance, and
`intent` reports what was searched:

```ts
const answer = await client.ask(
  'What are developers saying about Bun 1.3 this month?'
);

console.log(answer.intent.sources, answer.intent.time_range);
for (const result of answer.results) {
  console.log(result.relevance, result.source, result.title, result.link);
}
```

A completed request costs 5 credits. Ask is not available with pay-per-request
payments, and its default timeout is 45 seconds. Use `search` when you already
know which engine and keywords you want.

## Deepcrawl

`deepcrawl` starts a task and waits for it to finish:

```ts
const result = await client.deepcrawl('https://example.com', { type: 'all' });
console.log(result.zipUrl);
```

Use `startDeepcrawl`, `getDeepcrawlStatus`, and `waitForDeepcrawl` when the
application needs to control task persistence or polling itself.

## Screenshot

Screenshot responses are binary image bytes rather than JSON:

```ts
import { writeFile } from 'node:fs/promises';

const screenshot = await client.screenshot('https://example.com', {
  format: 'png',
  fullPage: true,
});

await writeFile('screenshot.png', screenshot.data);
console.log(screenshot.contentType, screenshot.requestId);
```

## Other APIs

The client also provides `news`, `crawl`, `sitemap`, `trending`, `extract`,
`usage`, and their batch variants where the HTTP API supports them.

`feedback` reports a Search1API problem, missing capability, or confusing
documentation. It is free and is never retried automatically, because a retry
could file a duplicate report. Do not include credentials or personal data:

```ts
await client.feedback('Results for this query have no publication dates', {
  category: 'feature_request',
  requestId: 'the x-search1api-request-id of the original request',
});
```

Requests time out after 30 seconds and retry `429` and transient `5xx`
responses twice by default. Authentication, payment, and validation errors are
never retried. Deepcrawl task creation and feedback are not retried
automatically because they are not idempotent. Configure this with `timeoutMs`
and `maxRetries`.

## Development

```bash
npm install
npm run generate
npm run typecheck
npm test
npm run build
```

The generated wire-level types come from the checked-in public OpenAPI
snapshot. Update the snapshot before regenerating types when the API contract
changes.

## License

MIT
