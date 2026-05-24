import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseController } from './base.controller';
import { BaseRepository } from './base.repo';

class MockRepo extends BaseRepository<'tags'> {
  constructor() {
    super('tags');
  }
}

class TestTagsController extends BaseController<'tags', MockRepo> {
  constructor(repo: MockRepo) {
    super(repo);
  }
}

describe('BaseController', () => {
  let repo: MockRepo;
  let controller: TestTagsController;

  beforeEach(() => {
    repo = new MockRepo();
    controller = new TestTagsController(repo);
    vi.restoreAllMocks();
  });

  it('should delegate add and addMany to repository', async () => {
    const addSpy = vi.spyOn(repo, 'add').mockResolvedValue({ id: '1' } as any);
    const addManySpy = vi.spyOn(repo, 'addMany').mockResolvedValue([{ id: '1' }] as any);

    const inputRow = {
      tenant_id: 'tenant-1',
      name: 'ControllerTag',
      createdby_id: 'user-1',
      updatedby_id: 'user-1',
    } as any;

    await controller.add(inputRow);
    expect(addSpy).toHaveBeenCalledWith({ row: inputRow }, undefined);

    await controller.addMany([inputRow]);
    expect(addManySpy).toHaveBeenCalledWith({ rows: [inputRow] }, undefined);
  });

  it('should delegate delete and deleteMany to repository', async () => {
    const deleteSpy = vi.spyOn(repo, 'delete').mockResolvedValue(true);
    const deleteManySpy = vi.spyOn(repo, 'deleteMany').mockResolvedValue(true);

    await controller.delete('tenant-1', 'tag-1');
    expect(deleteSpy).toHaveBeenCalledWith({ tenant_id: 'tenant-1', id: 'tag-1' });

    await controller.deleteMany('tenant-1', ['tag-1', 'tag-2']);
    expect(deleteManySpy).toHaveBeenCalledWith({ tenant_id: 'tenant-1', ids: ['tag-1', 'tag-2'] });
  });

  it('should delegate find to repository', async () => {
    const findSpy = vi.spyOn(repo, 'find').mockResolvedValue([]);

    await controller.find({ tenant_id: 'tenant-1', key: 'search', column: 'name' });
    expect(findSpy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      key: 'search',
      column: 'name',
    });
  });

  it('should delegate getAll and getAllWithCounts to repository', async () => {
    const getAllSpy = vi.spyOn(repo, 'getAll').mockResolvedValue([]);
    const getAllWithCountsSpy = vi.spyOn(repo, 'getAllWithCounts').mockResolvedValue({ rows: [], count: 0 });

    await controller.getAll('tenant-1', { limit: 10 });
    expect(getAllSpy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      options: { limit: 10 },
    });

    await controller.getAllWithCounts('tenant-1', { limit: 10 });
    expect(getAllWithCountsSpy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      options: { limit: 10 },
    });
  });

  it('should delegate getCount and getOneById to repository', async () => {
    const countSpy = vi.spyOn(repo, 'count').mockResolvedValue(5);
    const getOneBySpy = vi.spyOn(repo, 'getOneBy').mockResolvedValue({ id: '1' } as any);

    const count = await controller.getCount('tenant-1');
    expect(count).toBe(5);
    expect(countSpy).toHaveBeenCalledWith('tenant-1');

    await controller.getOneById({ tenant_id: 'tenant-1', id: 'tag-1' });
    expect(getOneBySpy).toHaveBeenCalledWith('id', {
      value: 'tag-1',
      tenant_id: 'tenant-1',
    });
  });

  it('should delegate update to repository', async () => {
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue(1 as any);

    const updateRow = { name: 'UpdatedName' } as any;
    await controller.update({ tenant_id: 'tenant-1', id: 'tag-1', row: updateRow });
    expect(updateSpy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      id: 'tag-1',
      row: updateRow,
    });
  });
});
