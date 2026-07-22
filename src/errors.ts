import type { ApiErrorBody, DeepcrawlStatusResponse } from './types.js';

export class Search1APIError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class Search1APIConfigurationError extends Search1APIError {}

export class APIConnectionError extends Search1APIError {}

export class APITimeoutError extends APIConnectionError {}

export class APIStatusError extends Search1APIError {
  readonly body?: ApiErrorBody;
  readonly headers: Headers;
  readonly requestId?: string;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    headers: Headers,
    body?: ApiErrorBody
  ) {
    super(message);
    this.status = status;
    this.headers = headers;
    this.body = body;
    this.requestId = headers.get('x-request-id') ?? undefined;
  }
}

export class BadRequestError extends APIStatusError {}
export class AuthenticationError extends APIStatusError {}
export class PaymentRequiredError extends APIStatusError {}
export class NotFoundError extends APIStatusError {}
export class UnprocessableEntityError extends APIStatusError {}
export class RateLimitError extends APIStatusError {}
export class InternalServerError extends APIStatusError {}

export class DeepcrawlFailedError extends Search1APIError {
  readonly response: DeepcrawlStatusResponse;

  constructor(response: DeepcrawlStatusResponse) {
    super(
      response.error ||
        response.message ||
        `Deepcrawl task ${response.taskId} failed`
    );
    this.response = response;
  }
}

export class DeepcrawlTimeoutError extends Search1APIError {
  readonly taskId: string;

  constructor(taskId: string, timeoutMs: number) {
    super(`Deepcrawl task ${taskId} did not finish within ${timeoutMs}ms`);
    this.taskId = taskId;
  }
}

export function apiStatusError(
  status: number,
  headers: Headers,
  body?: ApiErrorBody
): APIStatusError {
  const message =
    body?.message ||
    body?.detail ||
    body?.error ||
    body?.title ||
    `Search1API request failed with status ${status}`;
  const ErrorClass =
    status === 400
      ? BadRequestError
      : status === 401
        ? AuthenticationError
        : status === 402
          ? PaymentRequiredError
          : status === 404
            ? NotFoundError
            : status === 422
              ? UnprocessableEntityError
              : status === 429
                ? RateLimitError
                : status >= 500
                  ? InternalServerError
                  : APIStatusError;

  return new ErrorClass(message, status, headers, body);
}
