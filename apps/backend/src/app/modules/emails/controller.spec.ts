import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailsController } from './controller';
import { BadRequestError, InternalError } from '../../errors/app-errors';
import { BaseRepository } from '../../lib/base.repo';

describe('EmailsController Comments', () => {
  let controller: EmailsController;

  beforeEach(() => {
    controller = new EmailsController();
    vi.restoreAllMocks();
  });

  it('should throw BadRequestError if comment is empty or whitespace', async () => {
    await expect(controller.addComment('tenant-1', 'email-1', 'author-1', '')).rejects.toThrow(BadRequestError);
    await expect(controller.addComment('tenant-1', 'email-1', 'author-1', '   ')).rejects.toThrow(BadRequestError);
  });

  it('should call commentsRepo.add with the correct parameters', async () => {
    const mockCommentRow = {
      id: 'comment-123',
      tenant_id: 'tenant-1',
      email_id: 'email-1',
      author_id: 'author-1',
      comment: 'This is a test comment',
      createdby_id: 'author-1',
      updatedby_id: 'author-1',
    };

    const addSpy = vi.spyOn((controller as any).commentsRepo, 'add').mockResolvedValue(mockCommentRow);

    const result = await controller.addComment('tenant-1', 'email-1', 'author-1', 'This is a test comment');

    expect(addSpy).toHaveBeenCalledWith({
      row: {
        tenant_id: 'tenant-1',
        email_id: 'email-1',
        author_id: 'author-1',
        comment: 'This is a test comment',
        createdby_id: 'author-1',
        updatedby_id: 'author-1',
      },
    });
    expect(result).toEqual(mockCommentRow);
  });

  it('should throw InternalError if commentsRepo.add returns null or undefined', async () => {
    vi.spyOn((controller as any).commentsRepo, 'add').mockResolvedValue(undefined);

    await expect(
      controller.addComment('tenant-1', 'email-1', 'author-1', 'Some comment')
    ).rejects.toThrow(InternalError);
  });
});

describe('EmailsController Integration', () => {
  const controller = new EmailsController();
  const db = (BaseRepository as any)._db;
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  let tenantId: string;
  let userId: string;
  let emailId: string;

  beforeEach(async () => {
    tenantId = rand();
    userId = rand();
    emailId = rand();

    // 1. Tenant
    await db.insertInto('tenants').values({
      id: tenantId,
      name: 'Test Tenant',
    }).execute();

    // 2. User
    await db.insertInto('authusers').values({
      id: userId,
      tenant_id: tenantId,
      email: `test-${userId}@example.com`,
      password: 'password',
      first_name: 'Test',
      last_name: 'User',
      verified: true,
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();

    // 3. Email
    await db.insertInto('emails').values({
      id: emailId,
      tenant_id: tenantId,
      folder_id: '11',
      from_email: 'sender@example.com',
      to_email: 'recipient@example.com',
      subject: 'Test Email',
      preview: 'Preview',
      is_favourite: false,
      status: 'open',
      createdby_id: userId,
      updatedby_id: userId,
    }).execute();
  });

  afterEach(async () => {
    await db.deleteFrom('email_read_states').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('emails').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
    await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
  });

  it('should successfully toggle email read status', async () => {
    // 1. Read count by folder before setting read status (should be 1 because ers row doesn't exist, and is_read coalesces to false, i.e., unread)
    const countsBefore = await controller.getRepo().getEmailCountsByFolder(userId, tenantId);
    expect(countsBefore['11']).toBe(1);

    // 2. Set read status to true (read)
    const resRead = await controller.setEmailReadStatus(tenantId, userId, emailId, true);
    expect(resRead).toEqual({ success: true, email_id: emailId, is_read: true });

    // 3. Unread count in Inbox should now be 0
    const countsAfterRead = await controller.getRepo().getEmailCountsByFolder(userId, tenantId);
    expect(countsAfterRead['11']).toBe(0);

    // 4. Get emails by folder and verify is_read is true
    const emailsAfterRead = await controller.getRepo().getByFolderWithAttachmentFlag(userId, tenantId, '11');
    expect(emailsAfterRead[0].is_read).toBe(true);

    // 5. Set read status to false (unread)
    const resUnread = await controller.setEmailReadStatus(tenantId, userId, emailId, false);
    expect(resUnread).toEqual({ success: true, email_id: emailId, is_read: false });

    // 6. Unread count in Inbox should be back to 1
    const countsAfterUnread = await controller.getRepo().getEmailCountsByFolder(userId, tenantId);
    expect(countsAfterUnread['11']).toBe(1);

    // 7. Get emails by folder and verify is_read is false
    const emailsAfterUnread = await controller.getRepo().getByFolderWithAttachmentFlag(userId, tenantId, '11');
    expect(emailsAfterUnread[0].is_read).toBe(false);
  });

  it('should support limit and offset parameters when fetching emails by folder', async () => {
    // Insert 3 additional emails under this tenant
    const emailIds = [rand(), rand(), rand()];
    for (const eid of emailIds) {
      await db.insertInto('emails').values({
        id: eid,
        tenant_id: tenantId,
        folder_id: '11',
        from_email: 'extra@example.com',
        to_email: 'recipient@example.com',
        subject: 'Extra Email',
        preview: 'Preview',
        is_favourite: false,
        status: 'open',
        createdby_id: userId,
        updatedby_id: userId,
      }).execute();
    }

    // Total emails in inbox should be 4 (1 seeded in beforeEach + 3 extra)
    const allEmails = await controller.getEmails(userId, tenantId, '11');
    expect(allEmails.length).toBe(4);

    // Test Limit: should return only 2 emails
    const limitEmails = await controller.getEmails(userId, tenantId, '11', 2);
    expect(limitEmails.length).toBe(2);

    // Test Limit and Offset: should skip the first 2 and return the remaining 2
    const pagedEmails = await controller.getEmails(userId, tenantId, '11', 2, 2);
    expect(pagedEmails.length).toBe(2);

    // The items returned by pagination should be disjoint from the first page
    const firstPageIds = limitEmails.map((e: any) => e.id);
    const secondPageIds = pagedEmails.map((e: any) => e.id);
    for (const id of secondPageIds) {
      expect(firstPageIds).not.toContain(id);
    }
  });
});
