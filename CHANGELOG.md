# Changelog

## 0.6.1 - 2026-11-05

The `X-Search1API-Client` request header now reports the installed version (`typescript/0.6.1`). Since 0.3.0 it had always said `typescript/0.3.0`. The version lives in `src/version.ts` and a test keeps it equal to `package.json`. No API changes.

## 0.6.0 - 2026-11-05

Adds `DeepcrawlOptions` for `deepcrawl()` and `startDeepcrawl()`: `maxPages` (1-1000, default 1000; sent as `max_pages`), `includePaths` / `excludePaths` (up to 20 path rules each; sent as `include_paths` / `exclude_paths`) and `format` (`'zip'` by default, or `'json'`). `DeepcrawlStatusResponse` gains `format`, `stats` (`discovered`, `matched`, `skipped`, `crawled`, `failed`), `failed` (`{ url, error }[]`), and for `format: 'json'` `resultUrl` plus `pages` (`{ url, title, content }[]`, omitted above 5 MB). Still 20 credits per task. The bundled OpenAPI snapshot also records the X search metadata fields, `failureCategory` / `upstreamStatus` on crawl and extract errors, and the 404/410 responses of `POST /extract`.

## 0.5.0 - 2026-11-03

Adds `maps(query, options)` for `POST /maps`: one Google Maps page of up to 20 places with name, place ID and Maps link, plus address, phone, website, rating, review count, coordinates and opening hours when available. Options: `country`, `language`, `location` (`latitude`, `longitude`, `zoom`), `page` (1-6, pages after the first need `location`) and `maxResults`. 3 credits per completed page; API key or OAuth only. The bundled OpenAPI snapshot also records the 50-item batch limit for search, news and crawl.

## 0.4.0 - 2026-10-12

Breaking: search/news engine-specific fields move from each result's top level to optional `metadata` (`kind`, `stars`, `language`, `num_comments`, `points`, `story_url`). Read e.g. `result.metadata.stars` instead of `result.stars`. `published_date` stays at the top level. No legacy field aliases.
