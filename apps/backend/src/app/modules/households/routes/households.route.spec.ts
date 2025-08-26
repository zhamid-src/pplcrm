/**
 * Integration tests for household REST routes.
 */
import Fastify from 'fastify';
import { HouseholdsController } from '../controller';

describe('households REST routes', () => {
  const tenantId = 'tenant-1';
  let app: ReturnType<typeof Fastify>;
  const rows = [{ id: '1', name: 'Smith' }];

  beforeAll(async () => {
    jest.spyOn(HouseholdsController.prototype, 'getAll').mockResolvedValue(rows as any);
    jest
      .spyOn(HouseholdsController.prototype, 'getOneById')
      .mockImplementation(async ({ id }) => rows.find((r) => r.id === id) as any);
    jest.spyOn(HouseholdsController.prototype, 'getCount').mockResolvedValue(rows.length);

    const routes = (await import('./households.route')).default;
    app = Fastify();
    app.register(routes, { prefix: '/households' });
    await app.ready();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('gets all households', async () => {
    const res = await app.inject({ method: 'GET', url: '/households', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(rows);
  });

  it('gets a household by id', async () => {
    const res = await app.inject({ method: 'GET', url: '/households/1', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(rows[0]);
  });

  it('counts households', async () => {
    const res = await app.inject({ method: 'GET', url: '/households/count', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toBe(rows.length);
  });
});
