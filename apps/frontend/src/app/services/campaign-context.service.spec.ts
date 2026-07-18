import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignContextService } from './campaign-context.service';
import { ErrorService } from './error.service';
import { TokenService } from './api/token-service';

const CAMPAIGNS = [
  { id: 'c1', name: 'Office', status: 'active' },
  { id: 'c2', name: 'Election 2026', status: 'active' },
  { id: 'c3', name: 'Election 2022', status: 'archived' },
];

describe('CampaignContextService', () => {
  let service: CampaignContextService;
  let mockApi: {
    campaigns: {
      getContext: { query: ReturnType<typeof vi.fn> };
      setActiveCampaign: { mutate: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    mockApi = {
      campaigns: {
        getContext: {
          query: vi.fn().mockResolvedValue({ campaigns: CAMPAIGNS, active_campaign_id: 'c1' }),
        },
        setActiveCampaign: { mutate: vi.fn().mockResolvedValue(undefined) },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        CampaignContextService,
        { provide: ErrorService, useValue: { handle: vi.fn() } },
        { provide: TokenService, useValue: { getAuthToken: vi.fn().mockReturnValue('token') } },
        { provide: Router, useValue: { navigate: vi.fn(), url: '/' } },
      ],
    });

    service = TestBed.inject(CampaignContextService);
    (service as any).api = mockApi;
  });

  it('starts unloaded with no campaigns and no active context', () => {
    expect(service.loaded()).toBe(false);
    expect(service.campaigns()).toEqual([]);
    expect(service.activeCampaignId()).toBeNull();
    expect(service.activeCampaign()).toBeNull();
    expect(service.isArchivedContext()).toBe(false);
  });

  it('refresh() populates campaigns, the active id, and the loaded flag', async () => {
    await service.refresh();

    expect(service.loaded()).toBe(true);
    expect(service.campaigns()).toEqual(CAMPAIGNS);
    expect(service.activeCampaignId()).toBe('c1');
    expect(service.activeCampaign()?.name).toBe('Office');
  });

  it('ensureLoaded() fetches once and is a no-op afterwards', async () => {
    await service.ensureLoaded();
    await service.ensureLoaded();

    expect(mockApi.campaigns.getContext.query).toHaveBeenCalledTimes(1);
  });

  it('ensureLoaded() also no-ops after an explicit refresh()', async () => {
    await service.refresh();
    await service.ensureLoaded();

    expect(mockApi.campaigns.getContext.query).toHaveBeenCalledTimes(1);
  });

  describe('setActive', () => {
    beforeEach(async () => {
      await service.refresh();
    });

    it('no-ops when the id is already active', async () => {
      await service.setActive('c1');

      expect(mockApi.campaigns.setActiveCampaign.mutate).not.toHaveBeenCalled();
    });

    it('switches optimistically — the id flips before the server confirms', async () => {
      let resolveMutate!: () => void;
      mockApi.campaigns.setActiveCampaign.mutate.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveMutate = resolve;
        }),
      );

      const pending = service.setActive('c2');
      expect(service.activeCampaignId()).toBe('c2'); // mid-flight, not yet persisted

      resolveMutate();
      await pending;

      expect(mockApi.campaigns.setActiveCampaign.mutate).toHaveBeenCalledWith('c2');
      expect(service.activeCampaignId()).toBe('c2');
    });

    it('rolls back to the previous context and rethrows when persisting fails', async () => {
      const failure = new Error('server said no');
      mockApi.campaigns.setActiveCampaign.mutate.mockRejectedValue(failure);

      await expect(service.setActive('c2')).rejects.toBe(failure);

      expect(service.activeCampaignId()).toBe('c1');
    });
  });

  describe('derived context state', () => {
    it('activeCampaign() is null when the active id is not in the list', async () => {
      mockApi.campaigns.getContext.query.mockResolvedValue({ campaigns: CAMPAIGNS, active_campaign_id: 'gone' });
      await service.refresh();

      expect(service.activeCampaignId()).toBe('gone');
      expect(service.activeCampaign()).toBeNull();
      expect(service.isArchivedContext()).toBe(false);
    });

    it('isArchivedContext() gates mutations only for an archived active campaign', async () => {
      await service.refresh();
      expect(service.isArchivedContext()).toBe(false);

      await service.setActive('c3');
      expect(service.isArchivedContext()).toBe(true);

      await service.setActive('c2');
      expect(service.isArchivedContext()).toBe(false);
    });
  });
});
