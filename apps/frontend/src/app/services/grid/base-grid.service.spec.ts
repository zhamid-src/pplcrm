import { TestBed } from '@angular/core/testing';

import { AbstractGridService } from './base-grid.service';

describe('PplCRMBaseServiceService', () => {
  let service: AbstractGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AbstractGridService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
