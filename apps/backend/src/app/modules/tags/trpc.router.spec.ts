/**
 * Unit tests for `TagsRouter` verifying tag operations such as creation,
 * deletion, and lookup delegate correctly to the controller.
 */
import { TagsController } from './controller';
import { TagsRouter } from './trpc.router';

/** Test suite for tag-related router procedures. */
describe('TagsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof TagsRouter.createCaller>;

  /** Mock controller methods and create router caller. */
  beforeAll(() => {
    jest.spyOn(TagsController.prototype, 'addTag').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(TagsController.prototype, 'getCount').mockResolvedValue(1);
    jest.spyOn(TagsController.prototype, 'getAll').mockResolvedValue([{ id: '1' }] as any);
    jest.spyOn(TagsController.prototype, 'updateTag').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(TagsController.prototype, 'getById').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(TagsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(TagsController.prototype, 'deleteMany').mockResolvedValue(true as any);
    jest.spyOn(TagsController.prototype, 'findByName').mockResolvedValue([{ id: '1' }]);
    jest.spyOn(TagsController.prototype, 'getAllWithCounts').mockResolvedValue({ rows: [], count: 0 } as any);
    caller = TagsRouter.createCaller(ctx);
  });

  /** Restore mocked methods after tests. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /** Tests adding a tag returns the new ID. */
  it('adds a tag', async () => {
    await expect(caller.add({ name: 't' })).resolves.toEqual({ id: '1' });
  });

  /** Tests counting tags for the tenant. */
  it('counts tags', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });

  /** Tests retrieving all tags. */
  it('gets all tags', async () => {
    await expect(caller.getAll()).resolves.toEqual([{ id: '1' }]);
  });

  /** Tests updating a tag by ID. */
  it('updates a tag', async () => {
    await expect(caller.update({ id: '1', data: { name: 'n' } })).resolves.toEqual({ id: '1' });
  });

  /** Tests retrieving a tag by ID. */
  it('gets tag by id', async () => {
    await expect(caller.getById('1')).resolves.toEqual({ id: '1' });
  });

  /** Tests deleting a tag by ID. */
  it('deletes a tag', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  /** Tests deleting multiple tags at once. */
  it('deletes many tags', async () => {
    await expect(caller.deleteMany(['1'])).resolves.toBeTruthy();
  });

  /** Tests searching tags by name. */
  it('finds by name', async () => {
    await expect(caller.findByName('a')).resolves.toEqual([{ id: '1' }]);
  });

  /** Tests retrieving tags along with usage counts. */
  it('gets all with counts', async () => {
    await expect(caller.getAllWithCounts({} as any)).resolves.toEqual({ rows: [], count: 0 });
  });
});
