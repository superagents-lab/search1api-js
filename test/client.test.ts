import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  Search1API,
  Search1APIConfigurationError,
} from '../src/index.js';

function jsonResponse(body: unknown, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('Search1API TypeScript client', () => {
  it('requires an API key', () => {
    expect(() => new Search1API({ apiKey: '' })).toThrow(
      Search1APIConfigurationError
    );
  });

  it('rejects invalid retry and timeout settings before sending a request', async () => {
    expect(
      () => new Search1API({ apiKey: 'test-key', maxRetries: -1 })
    ).toThrow('maxRetries must be a non-negative integer');
    expect(() => new Search1API({ apiKey: 'test-key', timeoutMs: 0 })).toThrow(
      'timeoutMs must be positive'
    );

    const client = new Search1API({ apiKey: 'test-key' });
    await expect(client.health({ maxRetries: -1 })).rejects.toThrow(
      'maxRetries must be a non-negative integer'
    );
  });

  it('maps idiomatic search options to the API request', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        searchParameters: {
          query: 'agent sdk',
          max_results: 3,
          crawl_results: 0,
          image: false,
          include_sites: [],
          exclude_sites: [],
        },
        results: [],
      })
    );
    const client = new Search1API({ apiKey: 'test-key', fetch });

    await client.search('agent sdk', {
      searchService: 'google',
      maxResults: 3,
      includeSites: ['search1api.com'],
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.search1api.com/search');
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer test-key'
    );
    expect(JSON.parse(String(init.body))).toEqual({
      query: 'agent sdk',
      search_service: 'google',
      max_results: 3,
      include_sites: ['search1api.com'],
    });
  });

  it('does not retry authentication errors', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'Invalid API key' }, 401));
    const client = new Search1API({ apiKey: 'bad-key', fetch, maxRetries: 2 });

    await expect(client.usage()).rejects.toBeInstanceOf(AuthenticationError);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('retries rate limits and transient server failures', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'slow down' }, 429))
      .mockResolvedValueOnce(
        jsonResponse({
          usage: 99,
          user_id: 'user_1',
          credential_type: 'api_key',
          client_id: null,
        })
      );
    const client = new Search1API({
      apiKey: 'test-key',
      fetch,
      maxRetries: 1,
      retryDelayMs: 0,
    });

    await expect(client.usage()).resolves.toMatchObject({ usage: 99 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('starts and polls a deepcrawl task', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ taskId: 'task_1', status: 'queued' }, 202)
      )
      .mockResolvedValueOnce(
        jsonResponse({ taskId: 'task_1', status: 'processing' })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          taskId: 'task_1',
          status: 'completed',
          success: true,
          zipUrl: 'https://example.com/result.zip',
        })
      );
    const client = new Search1API({ apiKey: 'test-key', fetch });

    const result = await client.deepcrawl(
      'https://example.com',
      { type: 'all' },
      { pollIntervalMs: 0, timeoutMs: 100 }
    );

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry deepcrawl task creation by default', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'temporary failure' }, 502));
    const client = new Search1API({
      apiKey: 'test-key',
      fetch,
      maxRetries: 2,
      retryDelayMs: 0,
    });

    await expect(client.startDeepcrawl('https://example.com')).rejects.toThrow(
      'temporary failure'
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('covers every public OpenAPI operation', async () => {
    const contractUrl = new URL(
      '../openapi/search1api.openapi.json',
      import.meta.url
    );
    const contract = JSON.parse(await readFile(contractUrl, 'utf8')) as {
      paths: Record<string, Record<string, { operationId: string }>>;
    };
    const operationIds = Object.values(contract.paths)
      .flatMap((path) => Object.values(path))
      .map((operation) => operation.operationId)
      .sort();

    const operationMethods = {
      crawl: 'crawl',
      deepcrawl: 'startDeepcrawl',
      deepcrawlStatus: 'getDeepcrawlStatus',
      extract: 'extract',
      health: 'health',
      news: 'news',
      search: 'search',
      sitemap: 'sitemap',
      trending: 'trending',
      usage: 'usage',
    } as const;

    expect(operationIds).toEqual(Object.keys(operationMethods).sort());

    const client = new Search1API({ apiKey: 'test-key' });
    for (const method of Object.values(operationMethods)) {
      expect(typeof client[method]).toBe('function');
    }
    expect(client).not.toHaveProperty('screenshot');
  });
});
