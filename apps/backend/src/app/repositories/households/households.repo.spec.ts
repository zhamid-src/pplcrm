/**
 * Unit tests for the household repository.
 */
import { HouseholdRepo } from './households.repo';

describe('HouseholdRepo', () => {
  afterEach(() => jest.restoreAllMocks());

  /**
   * Verifies that `getTags` constructs the expected join and filter clauses.
   */
  it('getTags builds proper query', async () => {
    const repo = new HouseholdRepo();
    const execute = jest.fn().mockResolvedValue([]);
    const select = jest.fn().mockReturnValue({ execute });
    const whereTenant = jest.fn().mockReturnValue({ select });
    const whereId = jest.fn().mockReturnValue({ where: whereTenant });
    const innerJoinTags = jest.fn().mockReturnValue({ where: whereId });
    const innerJoinMap = jest.fn().mockReturnValue({ innerJoin: innerJoinTags });
    jest.spyOn(HouseholdRepo.prototype as any, 'getSelect').mockReturnValue({ innerJoin: innerJoinMap });

    await repo.getTags('h1', 't1');

    expect(innerJoinMap).toHaveBeenCalledWith('map_households_tags', 'map_households_tags.household_id', 'households.id');
    expect(innerJoinTags).toHaveBeenCalledWith('tags', 'tags.id', 'map_households_tags.tag_id');
    expect(whereId).toHaveBeenCalledWith('households.id', '=', 'h1');
    expect(whereTenant).toHaveBeenCalledWith('households.tenant_id', '=', 't1');
    expect(select).toHaveBeenCalledWith('tags.name');
    expect(execute).toHaveBeenCalled();
  });
});

