/**
 * Unit tests for the tags repository.
 */
import { TagsRepo } from "./tags.repo";

describe('TagsRepo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Ensures that `getIdByName` creates the correct select and where clauses.
   */
  it('getIdByName builds proper query', async () => {
    const repo = new TagsRepo();
    const executeTakeFirst = jest.fn().mockResolvedValue({ id: '1' });
    const where = jest.fn();
    const select = jest.fn();
    where.mockReturnValue({ where, executeTakeFirst });
    select.mockReturnValue({ where, executeTakeFirst });
    jest.spyOn(TagsRepo.prototype as any, 'getSelect').mockReturnValue({ select, where });

    const res = await repo.getIdByName({ tenant_id: 't1', name: 'tag' });

    expect(select).toHaveBeenCalledWith('id');
    expect(where).toHaveBeenNthCalledWith(1, 'name', '=', 'tag');
    expect(where).toHaveBeenNthCalledWith(2, 'tenant_id', '=', 't1');
    expect(executeTakeFirst).toHaveBeenCalled();
    expect(res).toEqual({ id: '1' });
  });
});
