import { TestBed } from "@angular/core/testing";

import { BaseGridService } from "./base-grid.service";

describe("PplCRMBaseServiceService", () => {
  let service: BaseGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseGridService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
