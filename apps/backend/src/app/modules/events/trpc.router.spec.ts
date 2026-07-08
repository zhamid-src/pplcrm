import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventsRouter } from './trpc.router';
import { EventsController } from './controller';
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

const AUTH = { tenant_id: '10', user_id: '20', session_id: 's1' };
// `isAuthed` merges a `role` field onto `ctx.auth` before calling the
// procedure, so controllers actually receive `{ ...AUTH, role: 'owner' }`.
// Match with objectContaining rather than asserting the exact shape.
const AUTH_MATCHER = expect.objectContaining(AUTH);

function validAddEventInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Community Fair',
    slug: 'community-fair',
    start_time: '2030-01-01T10:00:00.000Z',
    end_time: '2030-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('EventsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('rejects unauthenticated callers', async () => {
    const caller = EventsRouter.createCaller({ auth: undefined } as any);
    await expect(caller.getAll({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('calls getAllEvents on the controller', async () => {
    const mockResult = { rows: [{ id: '1', name: 'Fair' }], count: 1 };
    const spy = vi.spyOn(EventsController.prototype, 'getAllEvents').mockResolvedValue(mockResult as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getAll({});

    expect(spy).toHaveBeenCalledWith(AUTH_MATCHER, {});
    expect(result).toEqual(mockResult);
  });

  it('calls getOneById on the controller with valid numeric ID', async () => {
    const mockEvent = { id: '1', name: 'Fair' };
    const spy = vi.spyOn(EventsController.prototype, 'getOneById').mockResolvedValue(mockEvent as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getById('1');

    expect(spy).toHaveBeenCalledWith({ tenant_id: '10', id: '1' });
    expect(result).toEqual(mockEvent);
  });

  it('rejects getById with an invalid id format', async () => {
    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.getById('not-an-id')).rejects.toThrow();
  });

  it('calls addEvent on the controller with valid input', async () => {
    const mockEvent = { id: '1', name: 'Community Fair' };
    const spy = vi.spyOn(EventsController.prototype, 'addEvent').mockResolvedValue(mockEvent as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    const input = validAddEventInput();
    const result = await caller.add(input);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Community Fair', slug: 'community-fair' }),
      AUTH_MATCHER,
    );
    expect(result).toEqual(mockEvent);
  });

  it('rejects add with an invalid slug', async () => {
    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.add(validAddEventInput({ slug: 'Invalid Slug!' }))).rejects.toThrow();
  });

  it('propagates BAD_REQUEST from the controller when adding a duplicate slug', async () => {
    const { TRPCError } = await import('@trpc/server');
    vi.spyOn(EventsController.prototype, 'addEvent').mockRejectedValue(
      new TRPCError({ code: 'BAD_REQUEST', message: 'This URL slug is already in use.' }),
    );

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.add(validAddEventInput())).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('calls updateEvent on the controller', async () => {
    const spy = vi.spyOn(EventsController.prototype, 'updateEvent').mockResolvedValue({ id: '1', name: 'New' } as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await caller.update({ id: '1', data: { name: 'New' } });

    expect(spy).toHaveBeenCalledWith('1', { name: 'New' }, AUTH_MATCHER);
  });

  it('calls delete on the controller', async () => {
    const spy = vi.spyOn(EventsController.prototype, 'delete').mockResolvedValue(true as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.delete('1');

    expect(spy).toHaveBeenCalledWith('10', '1', '20');
    expect(result).toBe(true);
  });

  it('calls addTicketType and getTicketTypesForEvent on the controller', async () => {
    const addSpy = vi
      .spyOn(EventsController.prototype, 'addTicketType')
      .mockResolvedValue({ id: '1', name: 'General' } as any);
    const listSpy = vi
      .spyOn(EventsController.prototype, 'getTicketTypesForEvent')
      .mockResolvedValue([{ id: '1', name: 'General' }] as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await caller.addTicketType({ event_id: '1', name: 'General', price_cents: 500 });
    await caller.getTicketTypesForEvent('1');

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ event_id: '1', name: 'General' }), AUTH_MATCHER);
    expect(listSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
  });

  it('rejects addRegistration with a missing person_id', async () => {
    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.addRegistration({ event_id: '1' } as any)).rejects.toThrow();
  });

  it('calls addRegistration on the controller and propagates NOT_FOUND for a missing event', async () => {
    const { TRPCError } = await import('@trpc/server');
    const spy = vi
      .spyOn(EventsController.prototype, 'addRegistration')
      .mockRejectedValue(new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' }));

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.addRegistration({ event_id: '999', person_id: '1' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(spy).toHaveBeenCalled();
  });

  it('calls checkIn, updateRegistration, and deleteRegistration on the controller', async () => {
    const checkInSpy = vi.spyOn(EventsController.prototype, 'checkIn').mockResolvedValue({ id: '1' } as any);
    const updateSpy = vi.spyOn(EventsController.prototype, 'updateRegistration').mockResolvedValue({ id: '1' } as any);
    const deleteSpy = vi.spyOn(EventsController.prototype, 'deleteRegistration').mockResolvedValue(true as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await caller.checkIn('1');
    await caller.updateRegistration({ id: '1', data: { status: 'attended' } });
    await caller.deleteRegistration('1');

    expect(checkInSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
    expect(updateSpy).toHaveBeenCalledWith('1', { status: 'attended' }, AUTH_MATCHER);
    expect(deleteSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
  });

  it('calls getHistoryForPerson and getStatsForPerson on the controller', async () => {
    const historySpy = vi.spyOn(EventsController.prototype, 'getHistoryForPerson').mockResolvedValue([] as any);
    const statsSpy = vi
      .spyOn(EventsController.prototype, 'getEventStats')
      .mockResolvedValue({ events_count: 0 } as any);

    const caller = EventsRouter.createCaller({ auth: AUTH } as any);
    await caller.getHistoryForPerson('1');
    await caller.getStatsForPerson('1');

    expect(historySpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
    expect(statsSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
  });
});
