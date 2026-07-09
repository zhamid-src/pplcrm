import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DashboardController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

describe('DashboardController Closed Emails Attribution', () => {
  const controller = new DashboardController();
  const db = (BaseRepository as any)._db;
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  let tenantId: string;
  let user1Id: string; // Zee (closer)
  let user2Id: string; // Zeeshan (assignee)
  let campaignId: string;
  let emailId: string;

  beforeEach(async () => {
    tenantId = rand();
    user1Id = rand();
    user2Id = rand();
    campaignId = rand();
    emailId = rand();

    // 1. Tenant
    await db
      .insertInto('tenants')
      .values({
        id: tenantId,
        name: 'Stats Test Tenant',
      })
      .execute();

    // 2. Users
    await db
      .insertInto('authusers')
      .values([
        {
          id: user1Id,
          tenant_id: tenantId,
          email: `zee-${user1Id}@example.com`,
          password: 'password',
          first_name: 'Zee',
          last_name: 'Hamid',
          verified: true,
          createdby_id: user1Id,
          updatedby_id: user1Id,
        },
        {
          id: user2Id,
          tenant_id: tenantId,
          email: `zeeshan-${user2Id}@example.com`,
          password: 'password',
          first_name: 'Zeeshan',
          last_name: 'Ali',
          verified: true,
          createdby_id: user2Id,
          updatedby_id: user2Id,
        },
      ])
      .execute();

    // 3. Campaign (emails are campaign-scoped, §15)
    await db
      .insertInto('campaigns')
      .values({
        id: campaignId,
        tenant_id: tenantId,
        admin_id: user1Id,
        name: 'Stats Test Campaign',
        createdby_id: user1Id,
        updatedby_id: user1Id,
      })
      .execute();

    // 4. Email in Inbox (folder_id '11'), assigned to Zeeshan (user2Id), but closed
    await db
      .insertInto('emails')
      .values({
        id: emailId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        folder_id: '11',
        from_email: 'customer@example.com',
        to_email: 'support@example.com',
        subject: 'Issue Inquiry',
        preview: 'Preview',
        is_favourite: false,
        status: 'closed',
        assigned_to: user2Id,
        createdby_id: user2Id,
        updatedby_id: user2Id,
      })
      .execute();

    // 5. Activity log recording that Zee (user1Id) closed the email
    await db
      .insertInto('user_activity')
      .values({
        tenant_id: tenantId,
        user_id: user1Id,
        activity: 'close',
        entity: 'email',
        entity_id: emailId,
        createdby_id: user1Id,
        updatedby_id: user1Id,
      })
      .execute();
  });

  afterEach(async () => {
    await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('emails').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
  });

  it('should attribute closed emails to the actual closer user (Zee) instead of the assignee (Zeeshan)', async () => {
    const auth = { tenant_id: tenantId, user_id: user1Id, name: 'Zee' } as any;
    const stats = await controller.getStats(auth);

    // Verify emailsClosed list has Zee (user1Id) credited, and not Zeeshan
    const zeeClosed = stats.emailsClosed.find((u: any) => String(u.user_id) === user1Id);
    const zeeshanClosed = stats.emailsClosed.find((u: any) => String(u.user_id) === user2Id);

    expect(zeeClosed).toBeDefined();
    expect(zeeClosed?.count).toBe(1);
    expect(zeeshanClosed).toBeUndefined();

    // Verify userStats array has the correct counts
    const zeeStats = stats.userStats.find((u: any) => String(u.user_id) === user1Id);
    const zeeshanStats = stats.userStats.find((u: any) => String(u.user_id) === user2Id);

    expect(zeeStats?.closedCount).toBe(1);
    expect(zeeshanStats?.closedCount).toBe(0);
  });
});
