import Fastify from 'fastify';
import { EmailsController } from '../../controllers/emails.controller';

describe('emails REST routes', () => {
  const tenantId = 'tenant-1';
  let app: ReturnType<typeof Fastify>;
  const folders = [{ id: '1', name: 'Inbox' }];
  const emails = [{ id: '10', subject: 'Test' }];

  beforeAll(async () => {
    jest.spyOn(EmailsController.prototype, 'getFolders').mockResolvedValue(folders as any);
    jest
      .spyOn(EmailsController.prototype, 'getEmails')
      .mockImplementation(async (_t, folder) => (folder === '1' ? emails : []) as any);

    const routes = (await import('./emails.route')).default;
    app = Fastify();
    app.register(routes, { prefix: '/emails' });
    await app.ready();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('gets folders', async () => {
    const res = await app.inject({ method: 'GET', url: '/emails/folders', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(folders);
  });

  it('gets emails in folder', async () => {
    const res = await app.inject({ method: 'GET', url: '/emails/folder/1', headers: { 'tenant-id': tenantId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(emails);
  });
});
