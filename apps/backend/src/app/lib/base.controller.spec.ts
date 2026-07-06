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
    const getOneByIdSpy = vi.spyOn(repo, 'getOneById').mockResolvedValue({ id: '1' } as any);

    const count = await controller.getCount('tenant-1');
    expect(count).toBe(5);
    expect(countSpy).toHaveBeenCalledWith('tenant-1');

    await controller.getOneById({ tenant_id: 'tenant-1', id: 'tag-1' });
    expect(getOneByIdSpy).toHaveBeenCalledWith({
      id: 'tag-1',
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

  // SECURITY-REVIEW.md 3.2 — the inline export must be bounded so a huge tenant can't OOM the backend.
  describe('exportCsv row cap', () => {
    it('bounds the fetch to one past the cap and returns a normal export under it', async () => {
      const getAllSpy = vi.spyOn(repo, 'getAll').mockResolvedValue([
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ] as any);

      const response = await controller.exportCsv({ tenant_id: 'tenant-1' } as any);

      expect(response.rowCount).toBe(2);
      // getAll is asked for at most MAX_INLINE_EXPORT_ROWS + 1 rows so oversized sets are detectable.
      expect(getAllSpy).toHaveBeenCalledWith({
        tenant_id: 'tenant-1',
        options: expect.objectContaining({ limit: 50001 }),
      });
    });

    it('refuses an export that exceeds the cap with PAYLOAD_TOO_LARGE', async () => {
      // One row past the cap — the assert fires before any CSV is built.
      vi.spyOn(repo, 'getAll').mockResolvedValue(Array.from({ length: 50001 }, () => ({})) as any);

      await expect(controller.exportCsv({ tenant_id: 'tenant-1' } as any)).rejects.toMatchObject({
        code: 'PAYLOAD_TOO_LARGE',
      });
    });
  });
});
