/**
 * Unit tests for `HouseholdsRouter` ensuring household procedures
 * delegate correctly to the controller and produce expected results.
 */
import { HouseholdsController } from './controller';
import { HouseholdsRouter } from './trpc.router';

/** Test suite for household-related router procedures. */
describe('HouseholdsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof HouseholdsRouter.createCaller>;

  /** Mock controller methods and create a router caller. */
  beforeAll(() => {
    jest.spyOn(HouseholdsController.prototype, 'addHousehold').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(HouseholdsController.prototype, 'attachTag').mockResolvedValue(true as any);
    jest.spyOn(HouseholdsController.prototype, 'getCount').mockResolvedValue(1);
    jest.spyOn(HouseholdsController.prototype, 'deleteMany').mockResolvedValue(true as any);
    jest.spyOn(HouseholdsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(HouseholdsController.prototype, 'detachTag').mockResolvedValue(undefined as any);
    jest.spyOn(HouseholdsController.prototype, 'getAll').mockResolvedValue([{ id: '1' }] as any);
    jest.spyOn(HouseholdsController.prototype, 'getAllWithPeopleCount').mockResolvedValue({ rows: [], count: 0 } as any);
    jest.spyOn(HouseholdsController.prototype, 'getOneById').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(HouseholdsController.prototype, 'getDistinctTags').mockResolvedValue(['a']);
    jest.spyOn(HouseholdsController.prototype, 'getTags').mockResolvedValue(['a']);
    jest.spyOn(HouseholdsController.prototype, 'update').mockResolvedValue({ id: '1' } as any);
    caller = HouseholdsRouter.createCaller(ctx);
  });

  /** Restore mocked methods after tests complete. */
  afterAll(() => {
    jest.restoreAllMocks();
  });

  /** Tests adding a household returns the created ID. */
  it('adds a household', async () => {
    await expect(caller.add({} as any)).resolves.toEqual({ id: '1' });
  });

  /** Tests attaching a tag to a household. */
  it('attaches a tag', async () => {
    await expect(caller.attachTag({ id: '1', tag_name: 't' })).resolves.toBeTruthy();
  });

  /** Tests counting households for the tenant. */
  it('counts households', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });

  /** Tests deletion of multiple households. */
  it('deletes many households', async () => {
    await expect(caller.deleteMany(['1'])).resolves.toBeTruthy();
  });

  /** Tests deletion of a single household. */
  it('deletes a household', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  /** Tests detaching a tag from a household. */
  it('detaches tag', async () => {
    await expect(caller.detachTag({ id: '1', tag_name: 't' })).resolves.toBeUndefined();
  });

  /** Tests retrieval of all households. */
  it('gets all households', async () => {
    await expect(caller.getAll()).resolves.toEqual([{ id: '1' }]);
  });

  /** Tests retrieval of households with aggregated people counts. */
  it('gets all with people count', async () => {
    await expect(caller.getAllWithPeopleCount({} as any)).resolves.toEqual({ rows: [], count: 0 });
  });

  /** Tests retrieving a household by ID. */
  it('gets household by id', async () => {
    await expect(caller.getById('1')).resolves.toEqual({ id: '1' });
  });

  /** Tests retrieving distinct household tags. */
  it('gets distinct tags', async () => {
    await expect(caller.getDistinctTags()).resolves.toEqual(['a']);
  });

  /** Tests retrieving tags for a household. */
  it('gets tags', async () => {
    await expect(caller.getTags('1')).resolves.toEqual(['a']);
  });

  /** Tests updating household details. */
  it('updates household', async () => {
    await expect(caller.update({ id: '1', data: {} as any })).resolves.toEqual({ id: '1' });
  });
});
