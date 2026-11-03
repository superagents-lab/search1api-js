export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export type SearchEngine =
  | 'google'
  | 'bing'
  | 'bingcn'
  | 'duckduckgo'
  | 'yahoo'
  | 'yandex'
  | 'youtube'
  | 'x'
  | 'reddit'
  | 'github'
  | 'arxiv'
  | 'wechat'
  | 'bilibili'
  | 'imdb'
  | 'wikipedia'
  | 'grokipedia'
  | 'baidu'
  | '360'
  | 'quark';

export type NewsEngine =
  | 'google'
  | 'bing'
  | 'duckduckgo'
  | 'yahoo'
  | 'hackernews'
  | 'reuters';

export interface SearchOptions {
  searchService?: SearchEngine;
  maxResults?: number;
  /** Native SERP page (1-100). Only `bing`, `bingcn`, `baidu`, and `grokipedia` paginate; other engines ignore it. */
  page?: number;
  crawlResults?: number;
  image?: boolean;
  includeSites?: string[];
  excludeSites?: string[];
  language?: string;
  timeRange?: TimeRange;
}

export interface SearchRequest extends SearchOptions {
  query: string;
}

export interface NewsOptions {
  searchService?: NewsEngine;
  maxResults?: number;
  crawlResults?: number;
  image?: boolean;
  includeSites?: string[];
  excludeSites?: string[];
  language?: string;
  timeRange?: TimeRange;
}

export interface NewsRequest extends NewsOptions {
  query: string;
}

export interface SearchParameters {
  query: string;
  search_service?: SearchEngine;
  max_results: number;
  page?: number;
  crawl_results: number;
  image: boolean;
  include_sites: string[];
  exclude_sites: string[];
  language?: string;
  time_range?: TimeRange;
}

export interface NewsParameters
  extends Omit<SearchParameters, 'search_service' | 'page'> {
  search_service?: NewsEngine;
}

export interface SearchResultMetadata {
  /** GitHub: result type, repository stars/language, or thread comments. */
  kind?: 'repo' | 'issue' | 'pr' | 'discussion';
  stars?: number;
  language?: string;
  /** GitHub threads and Hacker News news results. */
  num_comments?: number;
  /** Hacker News: votes and submitted article URL; link is the discussion. */
  points?: number;
  story_url?: string;
  [key: string]: unknown;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  content?: string;
  /** ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`); omitted when the source exposes no date. */
  published_date?: string;
  metadata?: SearchResultMetadata;
  [key: string]: unknown;
}

export interface SearchResponse {
  searchParameters: SearchParameters;
  results: SearchResult[];
  images?: string[];
}

export interface NewsResponse {
  searchParameters: NewsParameters;
  results: SearchResult[];
  images?: string[];
}

export interface AskIntent {
  /** Keywords sent to the engines, with platform and time phrases removed. */
  search_query: string;
  /** Engines searched. */
  sources: string[];
  time_range: TimeRange | null;
}

export interface AskResult {
  title: string;
  link: string;
  snippet: string;
  published_date?: string;
  /** Engine that returned the result. */
  source: string;
  /** Relevance to the query, 0.5-1 with two decimals. */
  relevance: number;
}

export interface AskResponse {
  query: string;
  intent: AskIntent;
  results: AskResult[];
  /** Engines that failed while others completed. The request is still charged. */
  errors: Array<{ source: string; message: string }>;
}

export interface MapsLocation {
  latitude: number;
  longitude: number;
  /** Map zoom, 3-30. The API defaults to 14. */
  zoom?: number;
}

export interface MapsOptions {
  /** Two-letter country code. The API defaults to `us`. */
  country?: string;
  /** Result language, such as `en`, `de` or `zh-CN`. The API defaults to `en`. */
  language?: string;
  /** Search around this point. Required when `page` is greater than 1. */
  location?: MapsLocation;
  /** Google Maps page, 1-6. Each page is a separate, separately billed request. */
  page?: number;
  /** Places to return from the page, 1-20. Fewer places do not lower the price. */
  maxResults?: number;
}

export interface MapsParameters {
  query: string;
  country: string;
  language: string;
  location?: Required<MapsLocation>;
  page: number;
  max_results: number;
}

export interface MapsPlace {
  /** Position in the requested Google Maps page. Gaps can remain after filtering. */
  position: number;
  name: string;
  place_id: string;
  maps_url: string;
  address?: string;
  phone?: string;
  website?: string;
  thumbnail?: string;
  category?: string;
  categories?: string[];
  rating?: number;
  review_count?: number;
  coordinates?: { latitude: number; longitude: number };
  opening_hours?: Partial<
    Record<
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday',
      string
    >
  >;
  /** Source display text for the current opening state. */
  open_state?: string;
  /** Source display text for the price range. */
  price?: string;
  description?: string;
}

export interface MapsResponse {
  searchParameters: MapsParameters;
  results: MapsPlace[];
}

export type FeedbackCategory = 'bug' | 'feature_request' | 'docs' | 'other';

export interface FeedbackOptions {
  /** The task you were trying to complete. */
  intent?: string;
  category?: FeedbackCategory;
  /** The original problem request's `x-search1api-request-id`, if available. */
  requestId?: string;
  agent?: {
    name?: string;
    model?: string;
  };
}

export interface FeedbackResponse {
  id: string;
  status: 'new';
}

export interface BatchItem<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
  };
  cost: number;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  totalCost: number;
}

export interface BatchResponse<T> {
  results: BatchItem<T>[];
  summary: BatchSummary;
}

export interface CrawlOptions {
  enableFallback?: boolean;
}

export interface CrawlRequest extends CrawlOptions {
  url: string;
}

export interface CrawlResult {
  title: string;
  link: string;
  content: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CrawlResponse {
  crawlParameters: { url: string };
  results: CrawlResult;
}

export type ScreenshotFormat = 'png' | 'jpeg' | 'webp';
export type ScreenshotWaitUntil =
  | 'domcontentloaded'
  | 'load'
  | 'networkidle';

export interface ScreenshotViewport {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
}

export interface ScreenshotOptions {
  format?: ScreenshotFormat;
  fullPage?: boolean;
  viewport?: ScreenshotViewport;
  waitUntil?: ScreenshotWaitUntil;
  waitForSelector?: string;
  selector?: string;
  delayMs?: number;
  timeoutMs?: number;
  quality?: number;
  omitBackground?: boolean;
  colorScheme?: 'light' | 'dark';
  animations?: 'disabled' | 'allow';
}

export interface ScreenshotResponse {
  data: Uint8Array;
  contentType: string;
  requestId?: string;
}

export interface SitemapOptions {
  type?: 'sitemap' | 'all';
}

export interface SitemapResponse {
  links: string[];
}

export interface TrendingOptions {
  maxResults?: number;
}

export interface TrendingResult {
  title: string;
  url: string;
  description?: string | null;
}

export interface TrendingResponse {
  trendingParameters: {
    search_service: string;
    max_results?: number;
  };
  results: TrendingResult[];
}

export interface ExtractOptions {
  prompt?: string;
  responseFormat?: Record<string, JsonValue>;
}

export interface ExtractResponse<T = JsonValue> {
  success: true;
  extractParameters: { url: string };
  results: T;
}

export interface DeepcrawlOptions {
  type?: 'sitemap' | 'all';
}

export interface DeepcrawlAcceptedResponse {
  taskId: string;
  status: 'queued' | string;
}

export type DeepcrawlStatus =
  | 'queued'
  | 'waiting'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'not_found';

export interface DeepcrawlStatusResponse {
  taskId: string;
  status?: DeepcrawlStatus | string;
  success?: boolean;
  message?: string;
  error?: string | null;
  r2Key?: string;
  zipUrl?: string | null;
  [key: string]: unknown;
}

export interface WaitForDeepcrawlOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface UsageResponse {
  usage: number;
  user_id: string | null;
  credential_type: 'api_key' | 'oauth' | string;
  client_id: string | null;
}

export interface HealthResponse {
  status: string;
  timestamp?: string;
  version?: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  maxRetries?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface Search1APIOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export interface ApiErrorBody {
  ok?: false;
  error?: string;
  message?: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  [key: string]: unknown;
}
