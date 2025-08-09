/**
 * Integration tests for person REST routes.
 */
import Fastify from 'fastify';
import { PersonsController } from '../../controllers/persons.controller';

describe('persons REST routes', () => {
  const tenantId = 'tenant-1';
  let app: ReturnType<typeof Fastify>;
  const rows = [{ id: '1', first_name: 'Alice' }];

  beforeAll(async () => {
    jest.spyOn(PersonsController.prototype, 'getAll').mockResolvedValue(rows as any);
    jest
      .spyOn(PersonsController.prototype, 'getById')
      .mockImplementation(async ({ id }) => rows.find((r) => r.id === id) as any);
    jest.spyOn(PersonsController.prototype, 'getCount').mockResolvedValue(rows.length);

    const routes = (await import('./persons.route')).default;
    app = Fastify();
    app.register(routes, { prefix: '/persons' });
    await app.ready();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('gets all persons', async () => {
    const res = await app.inject({ method: 'GET', url: '/persons', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(rows);
  });

  it('gets a person by id', async () => {
    const res = await app.inject({ method: 'GET', url: '/persons/1', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(rows[0]);
  });

  it('counts persons', async () => {
    const res = await app.inject({ method: 'GET', url: '/persons/count', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toBe(rows.length);
  });
});
