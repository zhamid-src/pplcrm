import { TagsController } from './tags.controller';
import { TagsRepo } from '../repositories/tags.repo';

describe('TagsController', () => {
  const auth = { user_id: 'u1', tenant_id: 't1' } as any;
  let controller: TagsController;

  beforeEach(() => {
    controller = new TagsController();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds a tag with tenant and user info', async () => {
    const spy = jest.spyOn(TagsRepo.prototype, 'add').mockResolvedValue({ id: '1' } as any);
    await controller.addTag({ name: 't', description: 'd' } as any, auth);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual({
      row: { name: 't', description: 'd', tenant_id: 't1', createdby_id: 'u1' },
    });
  });

  it('finds by name', async () => {
    const spy = jest.spyOn(TagsController.prototype, 'find').mockResolvedValue([{ id: '1' }] as any);
    await expect(controller.findByName('a', auth)).resolves.toEqual([{ id: '1' }]);
    expect(spy).toHaveBeenCalledWith({ tenant_id: 't1', key: 'a', column: 'name' });
  });

  it('gets all with counts', async () => {
    const spy = jest.spyOn(TagsRepo.prototype, 'getAllWithCounts').mockResolvedValue({ rows: [], count: 0 } as any);
    await controller.getAllWithCounts(auth, {} as any);
    expect(spy).toHaveBeenCalled();
  });

  it('updates a tag with updatedby info', async () => {
    const spy = jest.spyOn(TagsController.prototype, 'update').mockResolvedValue({ id: '1' } as any);
    await controller.updateTag('1', { name: 'n' } as any, auth);
    expect(spy).toHaveBeenCalledWith({
      tenant_id: 't1',
      id: '1',
      row: { name: 'n', updatedby_id: 'u1' },
    });
  });
});
