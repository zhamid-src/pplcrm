import { PersonsService } from './persons-service';

function makeApiMock() {
  return {
    persons: {
      add: { mutate: jest.fn() },
      attachTag: { mutate: jest.fn() },
      count: { query: jest.fn() },
      delete: { mutate: jest.fn() },
      deleteMany: { mutate: jest.fn() },
      detachTag: { mutate: jest.fn() },
      getAllWithAddress: { query: jest.fn() },
      getByHouseholdId: { query: jest.fn() },
      getById: { query: jest.fn() },
      getTags: { query: jest.fn() },
      removeHousehold: { mutate: jest.fn() },
      update: { mutate: jest.fn() },
    },
  } as any;
}

describe('PersonsService behavior', () => {
  let service: PersonsService;
  let api: ReturnType<typeof makeApiMock>;

  beforeEach(() => {
    // Avoid Angular inject() in constructor; create a bare instance
    service = Object.create(PersonsService.prototype) as PersonsService;
    // patch the underlying api client with a mock and a fresh AbortController
    api = makeApiMock();
    (service as any).api = api;
    (service as any).ac = new AbortController();
  });

  it('add calls persons.add.mutate', async () => {
    const payload: any = { first_name: 'A' };
    await service.add(payload);
    expect(api.persons.add.mutate).toHaveBeenCalledWith(payload);
  });

  it('addMany resolves input array', async () => {
    const rows = [{ a: 1 } as any, { b: 2 } as any];
    await expect(service.addMany(rows)).resolves.toEqual(rows);
  });

  it('attachTag calls mutation with id and tag', async () => {
    await service.attachTag('id1', 'vip');
    expect(api.persons.attachTag.mutate).toHaveBeenCalledWith({ id: 'id1', tag_name: 'vip' });
  });

  it('count queries count', async () => {
    api.persons.count.query.mockResolvedValue(42);
    await expect(service.count()).resolves.toBe(42);
  });

  it('delete returns true when backend returns non-null', async () => {
    api.persons.delete.mutate.mockResolvedValue({});
    await expect(service.delete('id1')).resolves.toBe(true);
  });

  it('delete returns false when backend returns null', async () => {
    api.persons.delete.mutate.mockResolvedValue(null);
    await expect(service.delete('id1')).resolves.toBe(false);
  });

  it('deleteMany returns true when backend returns non-null', async () => {
    api.persons.deleteMany.mutate.mockResolvedValue({});
    await expect(service.deleteMany(['1','2'])).resolves.toBe(true);
  });

  it('detachTag calls mutation', async () => {
    await service.detachTag('id1', 'vip');
    expect(api.persons.detachTag.mutate).toHaveBeenCalledWith({ id: 'id1', tag_name: 'vip' });
  });

  it('getAll delegates to getAllWithAddress', async () => {
    const spy = jest.spyOn(service, 'getAllWithAddress').mockResolvedValue([] as any);
    const opts: any = { limit: 10 };
    await service.getAll(opts);
    expect(spy).toHaveBeenCalledWith(opts);
  });

  it('getAllWithAddress calls query with AbortController signal', async () => {
    const opts: any = { limit: 5 };
    await service.getAllWithAddress(opts);
    expect(api.persons.getAllWithAddress.query).toHaveBeenCalledWith(opts, expect.objectContaining({ signal: expect.any(Object) }));
  });

  it('getByHouseholdId calls query with id and options', async () => {
    const opts: any = { columns: ['id'] };
    await service.getByHouseholdId('hid', opts);
    expect(api.persons.getByHouseholdId.query).toHaveBeenCalledWith({ id: 'hid', options: opts });
  });

  it('getById queries by id', async () => {
    await service.getById('abc');
    expect(api.persons.getById.query).toHaveBeenCalledWith('abc');
  });

  it('getPeopleInHousehold returns [] for falsy id', async () => {
    await expect(service.getPeopleInHousehold(null)).resolves.toEqual([]);
    await expect(service.getPeopleInHousehold(undefined as any)).resolves.toEqual([]);
  });

  it('getPeopleInHousehold maps full_name', async () => {
    api.persons.getByHouseholdId.query.mockResolvedValue([
      { id: '1', first_name: 'A', middle_names: 'B', last_name: 'C' },
      { id: '2', first_name: 'X', middle_names: null, last_name: 'Z' },
    ]);

    const res = await service.getPeopleInHousehold('hid');
    expect(api.persons.getByHouseholdId.query).toHaveBeenCalledWith({ id: 'hid', options: { columns: ['id', 'first_name', 'middle_names', 'last_name'] } });
    expect(res).toEqual([
      { id: '1', first_name: 'A', middle_names: 'B', last_name: 'C', full_name: 'A B C' },
      { id: '2', first_name: 'X', middle_names: null, last_name: 'Z', full_name: 'X  Z' },
    ]);
  });

  it('getPeopleInHousehold merges options', async () => {
    api.persons.getByHouseholdId.query.mockResolvedValue([]);

    await service.getPeopleInHousehold('hid', { columns: ['preferred_name'], limit: 10 } as any);

    expect(api.persons.getByHouseholdId.query).toHaveBeenCalledWith({
      id: 'hid',
      options: {
        columns: ['preferred_name', 'id', 'first_name', 'middle_names', 'last_name'],
        limit: 10,
      },
    });
  });

  it('getTags maps names', async () => {
    api.persons.getTags.query.mockResolvedValue([{ name: 'vip' }, { name: 'lead' }]);
    await expect(service.getTags('id1')).resolves.toEqual(['vip', 'lead']);
  });

  it('removeHousehold forwards to api', async () => {
    await service.removeHousehold('id1');
    expect(api.persons.removeHousehold.mutate).toHaveBeenCalledWith('id1');
  });

  it('update forwards to api with id and data', async () => {
    const data: any = { first_name: 'New' };
    await service.update('id1', data);
    expect(api.persons.update.mutate).toHaveBeenCalledWith({ id: 'id1', data });
  });
});
