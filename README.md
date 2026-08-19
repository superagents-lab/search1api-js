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

CommonJS projects can load the same client with `require`:

```js
const { Search1API } = require('@search1api/client');
```

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

Requests time out after 30 seconds and retry `429` and transient `5xx`
responses twice by default. Authentication, payment, and validation errors are
never retried. Deepcrawl task creation is not retried automatically because it
is not idempotent. Configure this with `timeoutMs` and `maxRetries`.

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
