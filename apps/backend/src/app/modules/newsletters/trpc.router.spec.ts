import { TRPCError } from '@trpc/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewslettersRouter } from './trpc.router';
import { NewslettersController } from './controller';
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

const auth = { tenant_id: '1', user_id: '1', session_id: 's1', role: 'owner' };

describe('NewslettersRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('should call getAllWithCounts (via crud getAll) with tenant_id and options', async () => {
    const mockResult = { rows: [{ id: '1', name: 'Spring Update' }], count: 1 };
    const spy = vi.spyOn(NewslettersController.prototype, 'getAllWithCounts').mockResolvedValue(mockResult as any);

    const caller = NewslettersRouter.createCaller({ auth } as any);
    const result = await caller.getAll({});

    expect(spy).toHaveBeenCalledWith('1', {});
    expect(result).toEqual(mockResult);
  });

  it('should call getOneById via getById with a valid numeric id', async () => {
    const mockNewsletter = { id: '3', name: 'Fall Update' };
    const spy = vi.spyOn(NewslettersController.prototype, 'getOneById').mockResolvedValue(mockNewsletter as any);

    const caller = NewslettersRouter.createCaller({ auth } as any);
    const result = await caller.getById('3');

    expect(spy).toHaveBeenCalledWith({ tenant_id: '1', id: '3' });
    expect(result).toEqual(mockNewsletter);
  });

  it('should reject getById with a non-numeric id', async () => {
    const caller = NewslettersRouter.createCaller({ auth } as any);
    await expect(caller.getById('abc')).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('should call add on the controller with tenant/creator metadata attached', async () => {
    const mockCreated = { id: '10', name: 'Winter Update' };
    const spy = vi.spyOn(NewslettersController.prototype, 'add').mockResolvedValue(mockCreated as any);

    const caller = NewslettersRouter.createCaller({ auth } as any);
    const result = await caller.add({ name: 'Winter Update' });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Winter Update',
        tenant_id: '1',
        createdby_id: '1',
        updatedby_id: '1',
      }),
    );
    expect(result).toEqual(mockCreated);
  });

  it('should call update on the controller', async () => {
    const mockUpdated = { id: '3', name: 'Updated Name' };
    const spy = vi.spyOn(NewslettersController.prototype, 'update').mockResolvedValue(mockUpdated as any);

    const caller = NewslettersRouter.createCaller({ auth } as any);
    const result = await caller.update({ id: '3', data: { name: 'Updated Name' } });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: '1',
        id: '3',
        row: expect.objectContaining({ name: 'Updated Name', updatedby_id: '1' }),
      }),
    );
    expect(result).toEqual(mockUpdated);
  });

  it('should call getEngagementStats with tenant_id and id', async () => {
    const mockStats = { activities: [], timeline: [] };
    const spy = vi.spyOn(NewslettersController.prototype, 'getEngagementStats').mockResolvedValue(mockStats as any);

    const caller = NewslettersRouter.createCaller({ auth } as any);
    const result = await caller.getEngagementStats('3');

    expect(spy).toHaveBeenCalledWith('1', '3');
    expect(result).toEqual(mockStats);
  });

  it('should reject getEngagementStats with a non-numeric id', async () => {
    const caller = NewslettersRouter.createCaller({ auth } as any);
    await expect(caller.getEngagementStats('bad-id')).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('should call sendNewsletter on send', async () => {
    const mockSent = { id: '3', status: 'queuing' };
    const spy = vi.spyOn(NewslettersController.prototype, 'sendNewsletter').mockResolvedValue(mockSent as any);

    const caller = NewslettersRouter.createCaller({ auth } as any);
    const result = await caller.send('3');

    expect(spy).toHaveBeenCalledWith('1', '3', '1');
    expect(result).toEqual(mockSent);
  });

  it('should surface a BAD_REQUEST error from sendNewsletter (e.g. already sent)', async () => {
    vi.spyOn(NewslettersController.prototype, 'sendNewsletter').mockRejectedValue(
      new TRPCError({ code: 'BAD_REQUEST', message: 'Newsletter has already been sent or is currently sending' }),
    );

    const caller = NewslettersRouter.createCaller({ auth } as any);
    await expect(caller.send('3')).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('should reject unauthenticated requests with UNAUTHORIZED', async () => {
    const caller = NewslettersRouter.createCaller({} as any);
    await expect(caller.getAll({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
