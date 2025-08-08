import { TagsController } from '../controllers/tags.controller';
import { TagsRouter } from './tags.router';

describe('TagsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof TagsRouter.createCaller>;

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

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('adds a tag', async () => {
    await expect(caller.add({ name: 't' })).resolves.toEqual({ id: '1' });
  });

  it('counts tags', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });

  it('gets all tags', async () => {
    await expect(caller.getAll()).resolves.toEqual([{ id: '1' }]);
  });

  it('updates a tag', async () => {
    await expect(caller.update({ id: '1', data: { name: 'n' } })).resolves.toEqual({ id: '1' });
  });

  it('gets tag by id', async () => {
    await expect(caller.getById('1')).resolves.toEqual({ id: '1' });
  });

  it('deletes a tag', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  it('deletes many tags', async () => {
    await expect(caller.deleteMany(['1'])).resolves.toBeTruthy();
  });

  it('finds by name', async () => {
    await expect(caller.findByName('a')).resolves.toEqual([{ id: '1' }]);
  });

  it('gets all with counts', async () => {
    await expect(caller.getAllWithCounts({} as any)).resolves.toEqual({ rows: [], count: 0 });
  });
});
