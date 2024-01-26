import { TestBed } from '@angular/core/testing';

import { TagsService } from './tags.service';

describe('TagsBackendService', () => {
  let service: TagsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TagsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
