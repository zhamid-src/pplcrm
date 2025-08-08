import { HouseholdsController } from '../controllers/households.controller';
import { HouseholdsRouter } from './households.router';

describe('HouseholdsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof HouseholdsRouter.createCaller>;

  beforeAll(() => {
    jest.spyOn(HouseholdsController.prototype, 'addHousehold').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(HouseholdsController.prototype, 'attachTag').mockResolvedValue(true as any);
    jest.spyOn(HouseholdsController.prototype, 'getCount').mockResolvedValue(1);
    jest.spyOn(HouseholdsController.prototype, 'deleteMany').mockResolvedValue(true as any);
    jest.spyOn(HouseholdsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(HouseholdsController.prototype, 'detachTag').mockResolvedValue(undefined as any);
    jest.spyOn(HouseholdsController.prototype, 'getAll').mockResolvedValue([{ id: '1' }] as any);
    jest.spyOn(HouseholdsController.prototype, 'getAllWithPeopleCount').mockResolvedValue({ rows: [], count: 0 } as any);
    jest.spyOn(HouseholdsController.prototype, 'getById').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(HouseholdsController.prototype, 'getDistinctTags').mockResolvedValue(['a']);
    jest.spyOn(HouseholdsController.prototype, 'getTags').mockResolvedValue(['a']);
    jest.spyOn(HouseholdsController.prototype, 'update').mockResolvedValue({ id: '1' } as any);
    caller = HouseholdsRouter.createCaller(ctx);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('adds a household', async () => {
    await expect(caller.add({} as any)).resolves.toEqual({ id: '1' });
  });

  it('attaches a tag', async () => {
    await expect(caller.attachTag({ id: '1', tag_name: 't' })).resolves.toBeTruthy();
  });

  it('counts households', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });

  it('deletes many households', async () => {
    await expect(caller.deleteMany(['1'])).resolves.toBeTruthy();
  });

  it('deletes a household', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  it('detaches tag', async () => {
    await expect(caller.detachTag({ id: '1', tag_name: 't' })).resolves.toBeUndefined();
  });

  it('gets all households', async () => {
    await expect(caller.getAll()).resolves.toEqual([{ id: '1' }]);
  });

  it('gets all with people count', async () => {
    await expect(caller.getAllWithPeopleCount({} as any)).resolves.toEqual({ rows: [], count: 0 });
  });

  it('gets household by id', async () => {
    await expect(caller.getById('1')).resolves.toEqual({ id: '1' });
  });

  it('gets distinct tags', async () => {
    await expect(caller.getDistinctTags()).resolves.toEqual(['a']);
  });

  it('gets tags', async () => {
    await expect(caller.getTags('1')).resolves.toEqual(['a']);
  });

  it('updates household', async () => {
    await expect(caller.update({ id: '1', data: {} as any })).resolves.toEqual({ id: '1' });
  });
});
