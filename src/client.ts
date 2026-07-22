import {
  APIConnectionError,
  APITimeoutError,
  DeepcrawlFailedError,
  DeepcrawlTimeoutError,
  Search1APIConfigurationError,
  Search1APIError,
  apiStatusError,
} from './errors.js';
import type {
  ApiErrorBody,
  BatchResponse,
  CrawlOptions,
  CrawlRequest,
  CrawlResponse,
  DeepcrawlAcceptedResponse,
  DeepcrawlOptions,
  DeepcrawlStatusResponse,
  ExtractOptions,
  ExtractResponse,
  HealthResponse,
  JsonValue,
  NewsOptions,
  NewsRequest,
  NewsResponse,
  RequestOptions,
  ScreenshotOptions,
  ScreenshotResponse,
  Search1APIOptions,
  SearchOptions,
  SearchRequest,
  SearchResponse,
  SitemapOptions,
  SitemapResponse,
  TimeRange,
  TrendingOptions,
  TrendingResponse,
  UsageResponse,
  WaitForDeepcrawlOptions,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.search1api.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_DEEPCRAWL_POLL_INTERVAL_MS = 2_000;
const DEFAULT_DEEPCRAWL_TIMEOUT_MS = 300_000;

type RequestBody = JsonValue | Record<string, unknown> | unknown[];

interface InternalRequestOptions extends RequestOptions {
  body?: RequestBody;
  method?: 'GET' | 'POST';
  query?: Record<string, string | undefined>;
}

function environmentApiKey(): string | undefined {
  const processLike = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return processLike.process?.env?.SEARCH1API_API_KEY;
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Partial<T>;
}

function searchBody(query: string, options: SearchOptions) {
  return compact({
    query,
    search_service: options.searchService,
    max_results: options.maxResults,
    crawl_results: options.crawlResults,
    image: options.image,
    include_sites: options.includeSites,
    exclude_sites: options.excludeSites,
    language: options.language,
    time_range: options.timeRange,
  });
}

function newsBody(query: string, options: NewsOptions) {
  return compact({
    query,
    search_service: options.searchService,
    max_results: options.maxResults,
    crawl_results: options.crawlResults,
    image: options.image,
    include_sites: options.includeSites,
    exclude_sites: options.excludeSites,
    language: options.language,
    time_range: options.timeRange,
  });
}

function retryAfterMs(response: Response): number | undefined {
  const value = response.headers.get('retry-after');
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function validateRequestLimits(timeoutMs: number, maxRetries: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Search1APIConfigurationError('timeoutMs must be positive');
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Search1APIConfigurationError(
      'maxRetries must be a non-negative integer'
    );
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      new APIConnectionError('Search1API request was aborted')
    );
  }
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(new APIConnectionError('Search1API request was aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function errorBody(
  response: Response
): Promise<ApiErrorBody | undefined> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return { message: text };
  }
}

export class Search1API {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly maxRetries: number;
  readonly timeoutMs: number;

  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchClient: typeof fetch;
  private readonly retryDelayMs: number;

  constructor(options: Search1APIOptions | string = {}) {
    const normalized =
      typeof options === 'string' ? { apiKey: options } : options;
    const apiKey = normalized.apiKey || environmentApiKey();
    if (!apiKey) {
      throw new Search1APIConfigurationError(
        'Missing API key. Pass apiKey or set SEARCH1API_API_KEY.'
      );
    }

    const fetchClient = normalized.fetch || globalThis.fetch;
    if (!fetchClient) {
      throw new Search1APIConfigurationError(
        'No fetch implementation is available. Search1API requires Node.js 18+ or a custom fetch.'
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = (normalized.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchClient = fetchClient;
    this.timeoutMs = normalized.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = normalized.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = normalized.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    validateRequestLimits(this.timeoutMs, this.maxRetries);
    if (!Number.isFinite(this.retryDelayMs) || this.retryDelayMs < 0) {
      throw new Search1APIConfigurationError(
        'retryDelayMs must be non-negative'
      );
    }
    this.defaultHeaders = normalized.headers ?? {};
  }

  async search(
    query: string,
    options: SearchOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<SearchResponse> {
    return this.requestJson<SearchResponse>('/search', {
      ...requestOptions,
      method: 'POST',
      body: searchBody(query, options),
    });
  }

  async searchBatch(
    requests: SearchRequest[],
    requestOptions: RequestOptions = {}
  ): Promise<BatchResponse<SearchResponse>> {
    return this.requestJson<BatchResponse<SearchResponse>>('/search', {
      ...requestOptions,
      method: 'POST',
      body: requests.map(({ query, ...options }) => searchBody(query, options)),
    });
  }

  async news(
    query: string,
    options: NewsOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<NewsResponse> {
    return this.requestJson<NewsResponse>('/news', {
      ...requestOptions,
      method: 'POST',
      body: newsBody(query, options),
    });
  }

  async newsBatch(
    requests: NewsRequest[],
    requestOptions: RequestOptions = {}
  ): Promise<BatchResponse<NewsResponse>> {
    return this.requestJson<BatchResponse<NewsResponse>>('/news', {
      ...requestOptions,
      method: 'POST',
      body: requests.map(({ query, ...options }) => newsBody(query, options)),
    });
  }

  async crawl(
    url: string,
    options: CrawlOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<CrawlResponse> {
    return this.requestJson<CrawlResponse>('/crawl', {
      ...requestOptions,
      method: 'POST',
      body: compact({ url, enableFallback: options.enableFallback }),
    });
  }

  async crawlBatch(
    requests: CrawlRequest[],
    requestOptions: RequestOptions = {}
  ): Promise<CrawlResponse[]> {
    return this.requestJson<CrawlResponse[]>('/crawl', {
      ...requestOptions,
      method: 'POST',
      body: requests.map(({ url, enableFallback }) =>
        compact({ url, enableFallback })
      ),
    });
  }

  async sitemap(
    url: string,
    options: SitemapOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<SitemapResponse> {
    return this.requestJson<SitemapResponse>('/sitemap', {
      ...requestOptions,
      method: 'POST',
      body: compact({ url, type: options.type }),
    });
  }

  async trending(
    searchService: string,
    options: TrendingOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<TrendingResponse> {
    return this.requestJson<TrendingResponse>('/trending', {
      ...requestOptions,
      method: 'POST',
      body: compact({
        search_service: searchService,
        max_results: options.maxResults,
      }),
    });
  }

  async extract<T = JsonValue>(
    url: string,
    options: ExtractOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<ExtractResponse<T>> {
    return this.requestJson<ExtractResponse<T>>('/extract', {
      ...requestOptions,
      method: 'POST',
      body: compact({
        url,
        prompt: options.prompt,
        response_format: options.responseFormat,
      }),
    });
  }

  async screenshot(
    url: string,
    options: ScreenshotOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<ScreenshotResponse> {
    const response = await this.request('/screenshot', {
      ...requestOptions,
      method: 'POST',
      body: compact({
        url,
        format: options.format,
        full_page: options.fullPage,
        viewport: options.viewport
          ? compact({
              width: options.viewport.width,
              height: options.viewport.height,
              device_scale_factor: options.viewport.deviceScaleFactor,
            })
          : undefined,
        wait_until: options.waitUntil,
        wait_for_selector: options.waitForSelector,
        selector: options.selector,
        delay_ms: options.delayMs,
        timeout_ms: options.timeoutMs,
        quality: options.quality,
        omit_background: options.omitBackground,
        color_scheme: options.colorScheme,
        animations: options.animations,
      }),
    });

    const contentLength = response.headers.get('content-length');
    return {
      data: await response.arrayBuffer(),
      contentType:
        response.headers.get('content-type')?.split(';')[0] ||
        'application/octet-stream',
      contentLength: contentLength ? Number(contentLength) : undefined,
      etag: response.headers.get('etag') ?? undefined,
    };
  }

  async startDeepcrawl(
    url: string,
    options: DeepcrawlOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<DeepcrawlAcceptedResponse> {
    return this.requestJson<DeepcrawlAcceptedResponse>('/deepcrawl', {
      ...requestOptions,
      // Starting a task is not idempotent. A lost response could otherwise
      // enqueue and charge a duplicate crawl.
      maxRetries: requestOptions.maxRetries ?? 0,
      method: 'POST',
      body: compact({ url, type: options.type }),
    });
  }

  async getDeepcrawlStatus(
    taskId: string,
    requestOptions: RequestOptions = {}
  ): Promise<DeepcrawlStatusResponse> {
    return this.requestJson<DeepcrawlStatusResponse>(
      `/deepcrawl/status/${encodeURIComponent(taskId)}`,
      requestOptions
    );
  }

  async waitForDeepcrawl(
    taskId: string,
    options: WaitForDeepcrawlOptions = {}
  ): Promise<DeepcrawlStatusResponse> {
    const pollIntervalMs =
      options.pollIntervalMs ?? DEFAULT_DEEPCRAWL_POLL_INTERVAL_MS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_DEEPCRAWL_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const response = await this.getDeepcrawlStatus(taskId, {
        signal: options.signal,
      });
      if (response.success === true || response.status === 'completed') {
        return response;
      }
      if (
        response.success === false ||
        response.status === 'failed' ||
        response.status === 'not_found'
      ) {
        throw new DeepcrawlFailedError(response);
      }
      if (Date.now() + pollIntervalMs > deadline) {
        throw new DeepcrawlTimeoutError(taskId, timeoutMs);
      }
      await sleep(pollIntervalMs, options.signal);
    }
  }

  async deepcrawl(
    url: string,
    options: DeepcrawlOptions = {},
    waitOptions: WaitForDeepcrawlOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<DeepcrawlStatusResponse> {
    const task = await this.startDeepcrawl(url, options, requestOptions);
    return this.waitForDeepcrawl(task.taskId, waitOptions);
  }

  async usage(
    period?: TimeRange,
    requestOptions: RequestOptions = {}
  ): Promise<UsageResponse> {
    return this.requestJson<UsageResponse>('/usage', {
      ...requestOptions,
      query: { period },
    });
  }

  async health(requestOptions: RequestOptions = {}): Promise<HealthResponse> {
    return this.requestJson<HealthResponse>('/health', requestOptions);
  }

  private async requestJson<T>(
    path: string,
    options: InternalRequestOptions = {}
  ): Promise<T> {
    const response = await this.request(path, options);
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Search1APIError(
        `Search1API returned invalid JSON for ${path}`,
        { cause: error }
      );
    }
  }

  private async request(
    path: string,
    options: InternalRequestOptions = {}
  ): Promise<Response> {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    validateRequestLimits(options.timeoutMs ?? this.timeoutMs, maxRetries);
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(options.query || {})) {
      if (value !== undefined) url.searchParams.set(name, value);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchOnce(url, options);
      } catch (error) {
        if (
          attempt < maxRetries &&
          !options.signal?.aborted &&
          (error instanceof APIConnectionError ||
            error instanceof APITimeoutError)
        ) {
          await sleep(this.retryDelay(attempt), options.signal);
          continue;
        }
        throw error;
      }

      if (response.ok) return response;
      if (attempt < maxRetries && shouldRetry(response.status)) {
        await sleep(
          retryAfterMs(response) ?? this.retryDelay(attempt),
          options.signal
        );
        continue;
      }

      throw apiStatusError(
        response.status,
        response.headers,
        await errorBody(response)
      );
    }

    throw new Search1APIError('Search1API request exhausted its retry budget');
  }

  private async fetchOnce(
    url: URL,
    options: InternalRequestOptions
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? this.timeoutMs);
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', onAbort, { once: true });

    const headers = new Headers({
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-Search1API-Client': 'typescript/0.1.0',
      ...this.defaultHeaders,
      ...options.headers,
    });
    if (options.body !== undefined)
      headers.set('Content-Type', 'application/json');

    try {
      return await this.fetchClient(url, {
        method: options.method || 'GET',
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new APITimeoutError(
          `Search1API request timed out after ${options.timeoutMs ?? this.timeoutMs}ms`,
          { cause: error }
        );
      }
      if (options.signal?.aborted) {
        throw new APIConnectionError('Search1API request was aborted', {
          cause: error,
        });
      }
      throw new APIConnectionError('Unable to connect to Search1API', {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  private retryDelay(attempt: number): number {
    const base = this.retryDelayMs * 2 ** attempt;
    return base + Math.floor(Math.random() * base * 0.25);
  }
}
