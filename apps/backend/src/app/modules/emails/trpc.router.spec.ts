import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EmailsRouter } from './trpc.router';
import { EmailsController } from './controller';

describe('EmailsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call getFolders on the controller', async () => {
    const mockFolders = [{ id: '1', name: 'Inbox' }];
    const spy = vi.spyOn(EmailsController.prototype, 'getFolders').mockResolvedValue(mockFolders as any);
    
    const caller = EmailsRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
    const result = await caller.getFolders();
    
    expect(spy).toHaveBeenCalled();
    expect(result).toEqual(mockFolders);
  });

  it('should call getEmailBody on the controller with valid numeric ID', async () => {
    const mockBody = { html: '<p>Hello</p>' };
    const spy = vi.spyOn(EmailsController.prototype, 'getEmailBody').mockResolvedValue(mockBody as any);
    
    const caller = EmailsRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
    const result = await caller.getEmailBody('1');
    
    expect(spy).toHaveBeenCalledWith('1', '1');
    expect(result).toEqual(mockBody);
  });

  it('should throw validation error for invalid ID format', async () => {
    const caller = EmailsRouter.createCaller({ auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any } as any);
    
    await expect(caller.getEmailBody('e1')).rejects.toThrow();
  });
});
