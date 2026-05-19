import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PersonsRouter } from './trpc.router';
import { PersonsController } from './controller';

describe('PersonsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call getOneById on the controller', async () => {
    const mockPerson = { id: 'p1', first_name: 'John' };
    const spy = vi.spyOn(PersonsController.prototype, 'getOneById').mockResolvedValue(mockPerson as any);
    
    const caller = PersonsRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
    const result = await caller.getById('p1');
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockPerson);
  });

  it('should call getAll on the controller', async () => {
    const mockPersons = [{ id: 'p1', first_name: 'John' }];
    const spy = vi.spyOn(PersonsController.prototype, 'getAll').mockResolvedValue(mockPersons as any);
    
    const caller = PersonsRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
    const result = await caller.getAll({});
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockPersons);
  });
});
