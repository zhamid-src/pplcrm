import { TestBed } from "@angular/core/testing";

import { TagsGridService } from "./tags-grid.service";

describe("TagsService", () => {
  let service: TagsGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TagsGridService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
