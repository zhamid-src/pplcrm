// Lightweight, transport-agnostic error types you can throw from controllers/services.
export abstract class AppError extends Error {
  constructor(
    message: string,
    /** HTTP-ish status to enable consistent mapping */
    public readonly status: number,
    /** A stable string code you can map to tRPC codes or include in JSend */
    public readonly code: string,
    /** Optional structured details for UI/logging */
    public readonly data?: unknown,
    opts?: { cause?: unknown },
  ) {
    super(message);
    this.name = new.target.name;
    if (opts?.cause) (this as any).cause = opts.cause;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 400, 'BAD_REQUEST', data, opts);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 409, 'CONFLICT', data, opts);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 403, 'FORBIDDEN', data, opts);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Something went wrong, please try again', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', data, opts);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 404, 'NOT_FOUND', data, opts);
  }
}

export class PreconditionFailedError extends AppError {
  constructor(message = 'Precondition failed', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 412, 'PRECONDITION_FAILED', data, opts);
  }
}

export class ServerMisconfigError extends AppError {
  constructor(message = 'Server misconfiguration', data?: unknown) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', data);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 429, 'TOO_MANY_REQUESTS', data, opts);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'User is not authenticated. Please sign in', data?: unknown, opts?: { cause?: unknown }) {
    super(message, 401, 'UNAUTHORIZED', data, opts);
  }
}
