import { HttpInterceptorFn } from '@angular/common/http';

/**
 * A basic HTTP interceptor function that logs all outgoing HTTP requests.
 *
 * This interceptor uses Angular's functional interceptor approach.
 * You can expand it to add headers, handle tokens, or modify requests.
 *
 * @param req - The outgoing HTTP request.
 * @param next - The handler function to pass the request to the next interceptor or backend.
 * @returns An Observable of the HTTP event stream.
 */
export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('interceptor', req);
  return next(req);
};
