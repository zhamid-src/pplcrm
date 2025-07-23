import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * A placeholder HTTP interceptor for catching and handling HTTP errors.
 *
 * This interceptor currently forwards all requests without modification,
 * but it can be extended to catch and handle errors globally using RxJS
 * operators like `catchError`.
 */
@Injectable()
export class ErrorCatchingInterceptor implements HttpInterceptor {
  constructor() {}

  /**
   * Intercepts outgoing HTTP requests and allows for custom handling of
   * the request or response.
   *
   * @param request - The outgoing HTTP request.
   * @param next - The next handler in the HTTP chain.
   * @returns An Observable of the HTTP event stream.
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request);
  }
}
