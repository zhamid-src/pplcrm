import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EmailsRouter } from './trpc.router';
import { EmailsController } from './controller';

describe('EmailsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call getFolders on the controller', async () => {
    const mockFolders = [{ id: 'f1', name: 'Inbox' }];
    const spy = vi.spyOn(EmailsController.prototype, 'getFolders').mockResolvedValue(mockFolders as any);
    
    const caller = EmailsRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
    const result = await caller.getFolders();
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockFolders);
  });

  it('should call getEmailBody on the controller', async () => {
    const mockBody = { html: '<p>Hello</p>' };
    const spy = vi.spyOn(EmailsController.prototype, 'getEmailBody').mockResolvedValue(mockBody as any);
    
    const caller = EmailsRouter.createCaller({ auth: { tenant_id: 't1', user_id: 'u1', session_id: 's1' } as any } as any);
    const result = await caller.getEmailBody('e1');
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockBody);
  });
});
