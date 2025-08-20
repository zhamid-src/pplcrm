import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { jsend, JSendFailError, JSendServerError } from '@common';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { ErrorService } from './error.service';

/**
 * HttpContext flag to opt-out of global error handling for a request.
 */
export const SKIP_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);

/**
 * Interceptor that unwraps JSend responses and normalises errors.
 */
export const jsendInterceptor: HttpInterceptorFn = (req, next) => {
  const errorSvc = inject(ErrorService);
  const skip = req.context.get(SKIP_ERROR_HANDLER);

  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse) {
        const body = event.body;
        if (jsend.isSuccess(body)) return event.clone({ body: body.data });
        if (jsend.isFail(body)) throw new JSendFailError(body.data, event.status);
        if (jsend.isError(body)) {
          const err = new JSendServerError(body.message, body.code, event.status);
          if (!skip) errorSvc.handle(err);
          throw err;
        }
      }
      return event;
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const body = error.error;
        if (jsend.isFail(body)) {
          return throwError(() => new JSendFailError(body.data, error.status));
        }
        if (jsend.isError(body)) {
          const err = new JSendServerError(body.message, body.code, error.status);
          if (!skip) errorSvc.handle(err);
          return throwError(() => err);
        }
        const err = new JSendServerError(error.message, undefined, error.status);
        if (!skip) errorSvc.handle(err);
        return throwError(() => err);
      }
      if (!skip) errorSvc.handle(error);
      return throwError(() => error);
    }),
  );
};
