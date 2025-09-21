/**
 * @file Unit tests for {@link HouseholdsService} verifying interaction with the API layer.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HouseholdsService } from './households-service';
import { TokenService } from '../../../services/api/token-service';

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let apiMock: any;

  beforeEach(() => {
    apiMock = {
      households: {
        attachTag: { mutate: jest.fn() },
        getAllWithPeopleCount: { query: jest.fn() },
      },
    };
    TestBed.configureTestingModule({
      providers: [
        HouseholdsService,
        { provide: Router, useValue: {} },
        { provide: TokenService, useValue: { getAuthToken: () => null, getRefreshToken: () => null } },
      ],
    });
    service = TestBed.inject(HouseholdsService);
    (service as any).api = apiMock;
  });

  it('should attach tag via api', () => {
    service.attachTag('1', 'VIP');
    expect(apiMock.households.attachTag.mutate).toHaveBeenCalledWith({ id: '1', tag_name: 'VIP' });
  });

  it('should get all households with people count', async () => {
    const res = { rows: [], count: 0 };
    apiMock.households.getAllWithPeopleCount.query.mockResolvedValue(res);
    const options = { searchStr: 'a' } as any;
    const result = await service.getAll(options);
    expect(apiMock.households.getAllWithPeopleCount.query).toHaveBeenCalledWith(options, { signal: service['ac'].signal });
    expect(result).toBe(res);
  });
});
