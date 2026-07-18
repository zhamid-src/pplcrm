import { HttpContext, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import type { HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSendFailError, JSendServerError } from '../../../../../libs/common/src';
import { ErrorService } from './error.service';
import { SKIP_ERROR_HANDLER, jsendInterceptor } from './jsend.interceptor';

describe('jsendInterceptor', () => {
  let handleMock: ReturnType<typeof vi.fn>;

  const request = (skip = false) =>
    new HttpRequest('GET', '/api/things', {
      context: skip ? new HttpContext().set(SKIP_ERROR_HANDLER, true) : undefined,
    });

  const respondWith = (body: unknown, status = 200): HttpHandlerFn =>
    (() => of(new HttpResponse({ body, status }))) as HttpHandlerFn;

  const failWith = (error: unknown): HttpHandlerFn =>
    (() => throwError(() => error) as Observable<HttpEvent<unknown>>) as HttpHandlerFn;

  const run = (req: HttpRequest<unknown>, next: HttpHandlerFn) =>
    TestBed.runInInjectionContext(() => firstValueFrom(jsendInterceptor(req, next)));

  beforeEach(() => {
    handleMock = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorService, useValue: { handle: handleMock } }],
    });
  });

  it('unwraps a jsend success body to its data', async () => {
    const event = await run(request(), respondWith({ status: 'success', data: { id: '1' } }));

    expect((event as HttpResponse<unknown>).body).toEqual({ id: '1' });
    expect(handleMock).not.toHaveBeenCalled();
  });

  it('leaves a non-jsend body untouched', async () => {
    const event = await run(request(), respondWith({ anything: true }));

    expect((event as HttpResponse<unknown>).body).toEqual({ anything: true });
  });

  it('throws a JSendFailError for a jsend fail body on a 200 response', async () => {
    const promise = run(request(), respondWith({ status: 'fail', data: { name: 'required' } }));

    await expect(promise).rejects.toBeInstanceOf(JSendFailError);
    await expect(promise).rejects.toMatchObject({ data: { name: 'required' } });
    // A "fail" is the caller's validation problem — it must never reach ErrorService.
    expect(handleMock).not.toHaveBeenCalled();
  });

  it('throws a JSendServerError for a jsend error body and routes it to the error handler', async () => {
    const promise = run(request(), respondWith({ status: 'error', message: 'boom', code: 'X1' }, 200));

    await expect(promise).rejects.toBeInstanceOf(JSendServerError);
    await expect(promise).rejects.toMatchObject({ messageText: 'boom', code: 'X1' });
    // Exactly once: the throw from map() lands back in this interceptor's own
    // catchError, which must not report it a second time.
    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(handleMock.mock.calls[0][0]).toBeInstanceOf(JSendServerError);
  });

  it('respects SKIP_ERROR_HANDLER: still throws but stays silent', async () => {
    await expect(run(request(true), respondWith({ status: 'error', message: 'boom' }))).rejects.toBeInstanceOf(
      JSendServerError,
    );
    expect(handleMock).not.toHaveBeenCalled();
  });

  describe('HttpErrorResponse handling', () => {
    it('wraps a jsend error payload with the HTTP status and handles it', async () => {
      const httpError = new HttpErrorResponse({ status: 503, error: { status: 'error', message: 'down' } });

      const promise = run(request(), failWith(httpError));

      await expect(promise).rejects.toBeInstanceOf(JSendServerError);
      await expect(promise).rejects.toMatchObject({ messageText: 'down', statusCode: 503 });
      expect(handleMock).toHaveBeenCalledTimes(1);
    });

    it('wraps a jsend fail payload without handling it', async () => {
      const httpError = new HttpErrorResponse({ status: 422, error: { status: 'fail', data: { email: 'taken' } } });

      const promise = run(request(), failWith(httpError));

      await expect(promise).rejects.toBeInstanceOf(JSendFailError);
      await expect(promise).rejects.toMatchObject({ data: { email: 'taken' }, statusCode: 422 });
      expect(handleMock).not.toHaveBeenCalled();
    });

    it('wraps a non-jsend HTTP failure into a JSendServerError carrying the status', async () => {
      const httpError = new HttpErrorResponse({ status: 500, error: 'plain text explosion' });

      const promise = run(request(), failWith(httpError));

      await expect(promise).rejects.toBeInstanceOf(JSendServerError);
      await expect(promise).rejects.toMatchObject({ statusCode: 500 });
      expect(handleMock).toHaveBeenCalledTimes(1);
    });

    it('honors SKIP_ERROR_HANDLER on the error path too', async () => {
      const httpError = new HttpErrorResponse({ status: 500, error: { status: 'error', message: 'down' } });

      await expect(run(request(true), failWith(httpError))).rejects.toBeInstanceOf(JSendServerError);
      expect(handleMock).not.toHaveBeenCalled();
    });
  });

  it('passes non-HTTP errors through unchanged but still reports them', async () => {
    const networkError = new TypeError('Failed to fetch');

    await expect(run(request(), failWith(networkError))).rejects.toBe(networkError);
    expect(handleMock).toHaveBeenCalledWith(networkError);
  });
});
