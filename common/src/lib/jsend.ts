export interface JSendErrorInterface {
  code?: string | number;
  message: string;
  status: 'error';
}

export interface JSendFailInterface<E extends object = Record<string, unknown>> {
  data: E;
  status: 'fail';
}

export interface JSendSuccessInterface<T> {
  data: T;
  status: 'success';
}

export class JSendError extends Error {
  public override name = 'JSendServerError';

  constructor(
    public readonly messageText: string,
    public readonly code?: string | number,
    public readonly statusCode: number = 500,
  ) {
    super(messageText || 'Server error');
  }
}

export class JSendFail<E extends object = Record<string, unknown>> extends Error {
  public override name = 'JSendFailError';

  constructor(
    public readonly data: E,
    public readonly statusCode: number = 400,
  ) {
    super('Request failed');
  }
}

export type JSend<T = unknown, E extends object = Record<string, unknown>> =
  | JSendSuccessInterface<T>
  | JSendFailInterface<E>
  | JSendErrorInterface;

export type JSendStatus = 'success' | 'fail' | 'error';

// Helpful status mapping (useful in backend)
export function httpStatusForJSend(obj: JSend): number {
  if (jsend.isSuccess(obj)) return 200;
  if (jsend.isFail(obj)) return 400; // choose per-case if needed
  return 500;
}

export const jsend = {
  success<T>(data: T): JSendSuccessInterface<T> {
    return { status: 'success', data };
  },
  fail<E extends object = Record<string, unknown>>(data: E): JSendFailInterface<E> {
    return { status: 'fail', data };
  },
  error(message: string, code?: string | number): JSendErrorInterface {
    return {
      status: 'error',
      message,
      ...(code !== undefined ? { code } : {}),
    };
  },

  isSuccess<T = unknown>(x: unknown): x is JSendSuccessInterface<T> {
    return typeof x === 'object' && x !== null && (x as any).status === 'success' && 'data' in (x as any);
  },
  isFail<E extends object = Record<string, unknown>>(x: unknown): x is JSendFailInterface<E> {
    return typeof x === 'object' && x !== null && (x as any).status === 'fail' && 'data' in (x as any);
  },
  isError(x: unknown): x is JSendErrorInterface {
    return typeof x === 'object' && x !== null && (x as any).status === 'error' && 'message' in (x as any);
  },

  /** Unwraps success; throws typed errors for fail/error. */
  unwrap<T>(res: JSend<T>): T {
    if (this.isSuccess<T>(res)) return res.data;
    if (this.isFail(res)) throw new JSendFail(res.data as any, 400);
    if (this.isError(res)) throw new JSendError(res.message, res.code, 500);
    throw new Error('Unknown JSend shape');
  },
};
