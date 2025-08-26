/**
 * Integration tests for authentication REST routes.
 */
import Fastify from 'fastify';
import { AuthController } from '../controller';

describe('auth REST routes', () => {
  const tenantId = 'tenant-1';
  let app: ReturnType<typeof Fastify>;
  const rows = [{ id: '1', email: 'alice@example.com' }];

  beforeAll(async () => {
    jest.spyOn(AuthController.prototype, 'getAll').mockResolvedValue(rows as any);
    jest
      .spyOn(AuthController.prototype, 'getOneById')
      .mockImplementation(async ({ id }) => rows.find((r) => r.id === id) as any);
    jest.spyOn(AuthController.prototype, 'getCount').mockResolvedValue(rows.length);

    const routes = (await import('./auth.route')).default;
    app = Fastify();
    app.decorateReply('jsendSuccess', function (this: any, payload: any) {
      this.send({ status: 'success', data: payload });
    });
    app.register(routes, { prefix: '/auth' });
    await app.ready();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('gets all auth users', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'success', data: rows });
  });

  it('gets an auth user by id', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/1', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(rows[0]);
  });

  it('counts auth users', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/count', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toBe(rows.length);
  });
});
