import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HouseholdsRouter } from './trpc.router';
import { HouseholdsController } from './controller';

describe('HouseholdsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call getOneById on the controller with valid numeric ID', async () => {
    const mockHousehold = { id: '1', name: 'Smith Family' };
    const spy = vi.spyOn(HouseholdsController.prototype, 'getOneById').mockResolvedValue(mockHousehold as any);
    
    const caller = HouseholdsRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
    const result = await caller.getById('1');
    
    expect(spy).toHaveBeenCalledWith({ tenant_id: '1', id: '1' });
    expect(result).toEqual(mockHousehold);
  });

  it('should throw validation error for invalid ID format', async () => {
    const caller = HouseholdsRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
    
    await expect(caller.getById('h1')).rejects.toThrow();
  });

  it('should call getAll on the controller', async () => {
    const mockHouseholds = [{ id: '1', name: 'Smith Family' }];
    const spy = vi.spyOn(HouseholdsController.prototype, 'getAll').mockResolvedValue(mockHouseholds as any);
    
    const caller = HouseholdsRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
    const result = await caller.getAll();
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockHouseholds);
  });
});
