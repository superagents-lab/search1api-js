# Changelog

## 0.5.0 - 2026-11-03

Adds `maps(query, options)` for `POST /maps`: one Google Maps page of up to 20 places with name, place ID and Maps link, plus address, phone, website, rating, review count, coordinates and opening hours when available. Options: `country`, `language`, `location` (`latitude`, `longitude`, `zoom`), `page` (1-6, pages after the first need `location`) and `maxResults`. 3 credits per completed page; API key or OAuth only. The bundled OpenAPI snapshot also records the 50-item batch limit for search, news and crawl.

## 0.4.0 - 2026-10-12

Breaking: search/news engine-specific fields move from each result's top level to optional `metadata` (`kind`, `stars`, `language`, `num_comments`, `points`, `story_url`). Read e.g. `result.metadata.stars` instead of `result.stars`. `published_date` stays at the top level. No legacy field aliases.
