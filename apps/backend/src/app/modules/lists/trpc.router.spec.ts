/**
 * Unit tests for `ListsRouter` verifying list procedures delegate
 * correctly to the controller and return expected results.
 */
import { ListsController } from './controller';
import { ListsRouter } from './trpc.router';

/** Test suite for list-related router procedures. */
describe('ListsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof ListsRouter.createCaller>;

  /** Mock controller methods and create router caller. */
  beforeAll(() => {
    jest.spyOn(ListsController.prototype, 'addList').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(ListsController.prototype, 'getAll').mockResolvedValue([{ id: '1' }] as any);
    jest.spyOn(ListsController.prototype, 'getAllWithCounts').mockResolvedValue({ rows: [], count: 0 } as any);
    jest.spyOn(ListsController.prototype, 'getOneById').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(ListsController.prototype, 'getCount').mockResolvedValue(1);
    jest.spyOn(ListsController.prototype, 'updateList').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(ListsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(ListsController.prototype, 'deleteMany').mockResolvedValue(true as any);
    caller = ListsRouter.createCaller(ctx);
  });

  /** Restore mocked methods after tests. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /** Tests adding a list returns the new ID. */
  it('adds a list', async () => {
    await expect(caller.add({ name: 'n', object: 'people' } as any)).resolves.toEqual({ id: '1' });
  });

  /** Tests counting lists. */
  it('counts lists', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });

  /** Tests retrieving all lists. */
  it('gets all lists', async () => {
    await expect(caller.getAll()).resolves.toEqual([{ id: '1' }]);
  });

  /** Tests retrieving all lists with counts. */
  it('gets all with counts', async () => {
    await expect(caller.getAllWithCounts({} as any)).resolves.toEqual({ rows: [], count: 0 });
  });

  /** Tests retrieving a list by ID. */
  it('gets list by id', async () => {
    await expect(caller.getById('1')).resolves.toEqual({ id: '1' });
  });

  /** Tests updating a list. */
  it('updates list', async () => {
    await expect(caller.update({ id: '1', data: {} as any })).resolves.toEqual({ id: '1' });
  });

  /** Tests deleting a list. */
  it('deletes list', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  /** Tests deleting multiple lists. */
  it('deletes many lists', async () => {
    await expect(caller.deleteMany(['1'])).resolves.toBeTruthy();
  });
});
