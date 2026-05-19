import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HouseholdsRouter } from './trpc.router';
import { HouseholdsController } from './controller';

describe('HouseholdsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call getOneById on the controller', async () => {
    const mockHousehold = { id: 'h1', name: 'Smith Family' };
    const spy = vi.spyOn(HouseholdsController.prototype, 'getOneById').mockResolvedValue(mockHousehold as any);
    
    const caller = HouseholdsRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
    const result = await caller.getById('h1');
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockHousehold);
  });

  it('should call getAll on the controller', async () => {
    const mockHouseholds = [{ id: 'h1', name: 'Smith Family' }];
    const spy = vi.spyOn(HouseholdsController.prototype, 'getAll').mockResolvedValue(mockHouseholds as any);
    
    const caller = HouseholdsRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
    const result = await caller.getAll({});
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockHouseholds);
  });
});
