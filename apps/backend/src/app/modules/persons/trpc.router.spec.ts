import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PersonsRouter } from './trpc.router';
import { PersonsController } from './controller';
import { PersonsService } from './services/persons.service';
import { BaseRepository } from '../../lib/base.repo';

function mockAuthDb() {
  const mockQB: any = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ role: 'owner', verified: true }),
  };
  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn().mockReturnValue(mockQB),
  } as any);
}

describe('PersonsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('should call getOneById on the controller with valid numeric ID', async () => {
    const mockPerson = { id: '1', first_name: 'John' };
    const spy = vi.spyOn(PersonsController.prototype, 'getOneById').mockResolvedValue(mockPerson as any);

    const caller = PersonsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);
    const result = await caller.getById('1');

    expect(spy).toHaveBeenCalledWith({ tenant_id: '1', id: '1' });
    expect(result).toEqual(mockPerson);
  });

  it('should throw validation error for invalid ID format', async () => {
    const caller = PersonsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(caller.getById('p1')).rejects.toThrow();
  });

  it('should call getAll on the controller', async () => {
    const mockPersons = [{ id: '1', first_name: 'John' }];
    const spy = vi.spyOn(PersonsController.prototype, 'getAll').mockResolvedValue(mockPersons as any);

    const caller = PersonsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);
    const result = await caller.getAll({});

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockPersons);
  });

  it('should validate invalid email format on add/update', async () => {
    const caller = PersonsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(caller.add({ email: 'not-an-email' })).rejects.toThrow();
  });

  it('should allow valid email, empty string, or null on add', async () => {
    const spy = vi.spyOn(PersonsService.prototype, 'addPerson').mockResolvedValue({ id: '1' } as any);
    const caller = PersonsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await caller.add({ email: 'john@example.com' });
    await caller.add({ email: '' });
    await caller.add({ email: null });

    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should throw validation error for invalid tag name (empty or too long)', async () => {
    const caller = PersonsRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(caller.attachTag({ id: '1', tag_name: '' })).rejects.toThrow();
    await expect(caller.attachTag({ id: '1', tag_name: 'a'.repeat(51) })).rejects.toThrow();
  });
});
