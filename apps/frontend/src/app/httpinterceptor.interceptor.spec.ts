import { HttpInterceptorFn } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";

import { httpinterceptorInterceptor } from "./http.interceptor";

describe("httpinterceptorInterceptor", () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => httpinterceptorInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it("should be created", () => {
    expect(interceptor).toBeTruthy();
  });
});
