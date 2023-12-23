import { TestBed } from "@angular/core/testing";

import { PplCrmToastrService } from "./pplcrm-toast.service";

describe("ToastService", () => {
  let service: PplCrmToastrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PplCrmToastrService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
