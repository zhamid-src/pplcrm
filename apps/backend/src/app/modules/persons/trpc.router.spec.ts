/**
 * Unit tests for `PersonsRouter` verifying person procedures delegate
 * correctly to the controller and return expected results.
 */
import { PersonsController } from './controller';
import { PersonsRouter } from './trpc.router';

/** Test suite for person-related router procedures. */
describe('PersonsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof PersonsRouter.createCaller>;

  /** Mock controller methods and create router caller. */
  beforeAll(() => {
    jest.spyOn(PersonsController.prototype, 'addPerson').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(PersonsController.prototype, 'getAll').mockResolvedValue([{ id: '1' }] as any);
    jest.spyOn(PersonsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(PersonsController.prototype, 'getCount').mockResolvedValue(1);
    caller = PersonsRouter.createCaller(ctx);
  });

  /** Restore mocked methods after tests. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /** Tests adding a person returns the new ID. */
  it('adds a person', async () => {
    await expect(caller.add({})).resolves.toEqual({ id: '1' });
  });

  /** Tests retrieving all persons. */
  it('gets all persons', async () => {
    await expect(caller.getAll({} as any)).resolves.toEqual([{ id: '1' }]);
  });

  /** Tests deleting a person by ID. */
  it('deletes a person', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  /** Tests counting persons for the tenant. */
  it('counts persons', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });
});
