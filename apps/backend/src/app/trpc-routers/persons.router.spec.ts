import { PersonsController } from '../controllers/persons.controller';
import { PersonsRouter } from './persons.router';

describe('PersonsRouter', () => {
  const ctx = { auth: { user_id: 'u1', tenant_id: 't1', session_id: 's1' } } as any;
  let caller: ReturnType<typeof PersonsRouter.createCaller>;

  beforeAll(() => {
    jest.spyOn(PersonsController.prototype, 'addPerson').mockResolvedValue({ id: '1' } as any);
    jest.spyOn(PersonsController.prototype, 'getAll').mockResolvedValue([{ id: '1' }] as any);
    jest.spyOn(PersonsController.prototype, 'delete').mockResolvedValue(true as any);
    jest.spyOn(PersonsController.prototype, 'getCount').mockResolvedValue(1);
    caller = PersonsRouter.createCaller(ctx);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('adds a person', async () => {
    await expect(caller.add({})).resolves.toEqual({ id: '1' });
  });

  it('gets all persons', async () => {
    await expect(caller.getAll({} as any)).resolves.toEqual([{ id: '1' }]);
  });

  it('deletes a person', async () => {
    await expect(caller.delete('1')).resolves.toBeTruthy();
  });

  it('counts persons', async () => {
    await expect(caller.count()).resolves.toBe(1);
  });
});
