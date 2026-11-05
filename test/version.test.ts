import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { Search1API } from '../src/index.js';
import { SDK_VERSION } from '../src/version.js';

describe('client version', () => {
  it('matches package.json, so a release cannot ship a stale version', async () => {
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version: string };
    expect(SDK_VERSION).toBe(pkg.version);
  });

  it('is sent in the X-Search1API-Client header', async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ usage: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const client = new Search1API({ apiKey: 'test-key', fetch });

    await client.usage();

    const [, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(new Headers(init.headers).get('x-search1api-client')).toBe(
      `typescript/${SDK_VERSION}`
    );
  });
});
