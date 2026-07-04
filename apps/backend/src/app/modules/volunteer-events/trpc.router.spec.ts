import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VolunteerRouter } from './trpc.router';
import { VolunteerEventsController } from './controller';
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
    name: 'Park Cleanup',
    slug: 'park-cleanup',
    start_time: '2030-01-01T10:00:00.000Z',
    end_time: '2030-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('VolunteerRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb();
  });

  it('rejects unauthenticated callers', async () => {
    const caller = VolunteerRouter.createCaller({ auth: undefined } as any);
    await expect(caller.getAll({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('calls getAllEvents on the controller', async () => {
    const mockResult = { rows: [{ id: '1', name: 'Cleanup' }], count: 1 };
    const spy = vi.spyOn(VolunteerEventsController.prototype, 'getAllEvents').mockResolvedValue(mockResult as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getAll({});

    expect(spy).toHaveBeenCalledWith(AUTH_MATCHER, {});
    expect(result).toEqual(mockResult);
  });

  it('calls getOneById on the controller with a valid numeric id', async () => {
    const mockEvent = { id: '1', name: 'Cleanup' };
    const spy = vi.spyOn(VolunteerEventsController.prototype, 'getOneById').mockResolvedValue(mockEvent as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.getById('1');

    expect(spy).toHaveBeenCalledWith({ tenant_id: '10', id: '1' });
    expect(result).toEqual(mockEvent);
  });

  it('rejects getById with an invalid id format', async () => {
    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.getById('bad-id')).rejects.toThrow();
  });

  it('calls addEvent on the controller with valid input', async () => {
    const mockEvent = { id: '1', name: 'Park Cleanup' };
    const spy = vi.spyOn(VolunteerEventsController.prototype, 'addEvent').mockResolvedValue(mockEvent as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.add(validAddEventInput());

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Park Cleanup', slug: 'park-cleanup' }),
      AUTH_MATCHER,
    );
    expect(result).toEqual(mockEvent);
  });

  it('rejects add with an invalid slug', async () => {
    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.add(validAddEventInput({ slug: 'Not A Slug' }))).rejects.toThrow();
  });

  it('propagates BAD_REQUEST from the controller when adding a duplicate slug', async () => {
    const { TRPCError } = await import('@trpc/server');
    vi.spyOn(VolunteerEventsController.prototype, 'addEvent').mockRejectedValue(
      new TRPCError({ code: 'BAD_REQUEST', message: 'This URL slug is already in use.' }),
    );

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.add(validAddEventInput())).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('calls updateEvent on the controller', async () => {
    const spy = vi
      .spyOn(VolunteerEventsController.prototype, 'updateEvent')
      .mockResolvedValue({ id: '1', name: 'New' } as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await caller.update({ id: '1', data: { name: 'New' } });

    expect(spy).toHaveBeenCalledWith('1', { name: 'New' }, AUTH_MATCHER);
  });

  it('calls delete on the controller', async () => {
    const spy = vi.spyOn(VolunteerEventsController.prototype, 'delete').mockResolvedValue(true as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    const result = await caller.delete('1');

    expect(spy).toHaveBeenCalledWith('10', '1', '20');
    expect(result).toBe(true);
  });

  it('calls getShiftsForEvent and signupVolunteer on the controller', async () => {
    const listSpy = vi
      .spyOn(VolunteerEventsController.prototype, 'getShiftsForEvent')
      .mockResolvedValue([{ id: '1' }] as any);
    const signupSpy = vi
      .spyOn(VolunteerEventsController.prototype, 'signupVolunteer')
      .mockResolvedValue({ id: '1', status: 'signed_up' } as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await caller.getShiftsForEvent('1');
    await caller.signupVolunteer({ event_id: '1', person_id: '2' });

    expect(listSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
    expect(signupSpy).toHaveBeenCalledWith(expect.objectContaining({ event_id: '1', person_id: '2' }), AUTH_MATCHER);
  });

  it('rejects signupVolunteer with a missing person_id', async () => {
    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.signupVolunteer({ event_id: '1' } as any)).rejects.toThrow();
  });

  it('propagates errors from signupVolunteer when a duplicate signup is attempted', async () => {
    vi.spyOn(VolunteerEventsController.prototype, 'signupVolunteer').mockRejectedValue(
      new Error('This person is already signed up for this event.'),
    );

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await expect(caller.signupVolunteer({ event_id: '1', person_id: '2' })).rejects.toThrow();
  });

  it('calls updateShift and deleteShift on the controller', async () => {
    const updateSpy = vi
      .spyOn(VolunteerEventsController.prototype, 'updateShift')
      .mockResolvedValue({ id: '1', status: 'attended' } as any);
    const deleteSpy = vi.spyOn(VolunteerEventsController.prototype, 'deleteShift').mockResolvedValue(true as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await caller.updateShift({ id: '1', data: { status: 'attended' } });
    await caller.deleteShift('1');

    expect(updateSpy).toHaveBeenCalledWith('1', { status: 'attended' }, AUTH_MATCHER);
    expect(deleteSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
  });

  it('calls getHistoryForPerson and getVolunteerStats on the controller', async () => {
    const historySpy = vi
      .spyOn(VolunteerEventsController.prototype, 'getHistoryForPerson')
      .mockResolvedValue([] as any);
    const statsSpy = vi
      .spyOn(VolunteerEventsController.prototype, 'getVolunteerStats')
      .mockResolvedValue({ shifts_count: 0, total_hours: 0 } as any);

    const caller = VolunteerRouter.createCaller({ auth: AUTH } as any);
    await caller.getHistoryForPerson('1');
    await caller.getVolunteerStats('1');

    expect(historySpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
    expect(statsSpy).toHaveBeenCalledWith('1', AUTH_MATCHER);
  });
});
