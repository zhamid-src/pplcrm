import { TestBed } from '@angular/core/testing';

import { TagsBackendService } from './tags-be.service';

describe('TagsBackendService', () => {
  let service: TagsBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TagsBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
