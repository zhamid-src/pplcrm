import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BillingRouter } from './trpc.router';
import { BillingController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

function mockAuthDb(role: string) {
  const mockQB: any = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue({ role, verified: true }),
  };
  vi.spyOn(BaseRepository, 'dbInstance', 'get').mockReturnValue({
    selectFrom: vi.fn().mockReturnValue(mockQB),
  } as any);
}

describe('BillingRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthDb('owner');
  });

  it('should call getBillingDetails on the controller', async () => {
    const mockDetails = { plan: 'free', status: 'inactive' };
    const spy = vi.spyOn(BillingController.prototype, 'getBillingDetails').mockResolvedValue(mockDetails as any);

    const caller = BillingRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);
    const result = await caller.getDetails();

    expect(spy).toHaveBeenCalledWith({ tenant_id: '1', user_id: '1', session_id: 's1', role: 'owner' });
    expect(result).toEqual(mockDetails);
  });

  it('should call createCheckoutSession with the requested plan', async () => {
    const spy = vi
      .spyOn(BillingController.prototype, 'createCheckoutSession')
      .mockResolvedValue({ url: 'https://checkout.example.com' } as any);

    const caller = BillingRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);
    const result = await caller.createCheckout({ plan: 'grassroots' });

    expect(spy).toHaveBeenCalledWith({ tenant_id: '1', user_id: '1', session_id: 's1', role: 'owner' }, 'grassroots');
    expect(result).toEqual({ url: 'https://checkout.example.com' });
  });

  it('should reject createCheckout with an invalid plan', async () => {
    const caller = BillingRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(caller.createCheckout({ plan: 'enterprise' } as any)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('should call createPortalSession on the controller', async () => {
    const spy = vi
      .spyOn(BillingController.prototype, 'createPortalSession')
      .mockResolvedValue({ url: 'https://portal.example.com' } as any);

    const caller = BillingRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);
    const result = await caller.createPortal();

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual({ url: 'https://portal.example.com' });
  });

  it('should call activateMockPlan and cancelMockPlan on the controller', async () => {
    const activateSpy = vi
      .spyOn(BillingController.prototype, 'activateMockPlan')
      .mockResolvedValue({ success: true, plan: 'representative' } as any);
    const cancelSpy = vi
      .spyOn(BillingController.prototype, 'cancelMockPlan')
      .mockResolvedValue({ success: true } as any);

    const caller = BillingRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await caller.activateMockPlan({ plan: 'representative' });
    expect(activateSpy).toHaveBeenCalledWith(
      { tenant_id: '1', user_id: '1', session_id: 's1', role: 'owner' },
      'representative',
    );

    await caller.cancelMockPlan();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should reject non-admin/owner users with FORBIDDEN', async () => {
    vi.restoreAllMocks();
    mockAuthDb('user');

    const caller = BillingRouter.createCaller({
      auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any,
    } as any);

    await expect(caller.getDetails()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('should reject unauthenticated requests with UNAUTHORIZED', async () => {
    const caller = BillingRouter.createCaller({} as any);
    await expect(caller.getDetails()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
