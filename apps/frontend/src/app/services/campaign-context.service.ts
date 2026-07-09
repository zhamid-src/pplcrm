import { computed, Service, signal } from '@angular/core';

import { TRPCService } from './api/trpc-service';
import type { RouterOutputs } from './api/trpc-types';

export type CampaignContextItem = RouterOutputs['campaigns']['getContext']['campaigns'][number];

/**
 * Campaigns §15 — which context (office or election campaign) the user is working in.
 * The active id is persisted per-user on the backend (profiles.preferences), so it
 * follows the user across devices. Loaded once by the switcher; every campaign-scoped
 * page reads `activeCampaignId()` and passes it to its API calls.
 */
@Service()
export class CampaignContextService extends TRPCService<unknown> {
  private readonly _campaigns = signal<CampaignContextItem[]>([]);
  private readonly _activeId = signal<string | null>(null);
  private readonly _loaded = signal(false);

  public readonly campaigns = computed(() => this._campaigns());
  public readonly loaded = computed(() => this._loaded());
  public readonly activeCampaignId = computed(() => this._activeId());
  public readonly activeCampaign = computed(() => {
    const id = this._activeId();
    return id ? (this._campaigns().find((c) => c.id === id) ?? null) : null;
  });
  /** Archived contexts are viewable but read-only — pages use this to gate mutations. */
  public readonly isArchivedContext = computed(() => this.activeCampaign()?.status === 'archived');

  /** Idempotent initial load; safe to call from any component that needs context. */
  public async ensureLoaded(): Promise<void> {
    if (this._loaded()) return;
    await this.refresh();
  }

  /** Re-fetch after campaigns are created/edited/archived. */
  public async refresh(): Promise<void> {
    const ctx = await this.api.campaigns.getContext.query();
    this._campaigns.set(ctx.campaigns);
    this._activeId.set(ctx.active_campaign_id);
    this._loaded.set(true);
  }

  /** Optimistically switch context, then persist the preference server-side. */
  public async setActive(id: string): Promise<void> {
    const previous = this._activeId();
    if (previous === id) return;
    this._activeId.set(id);
    try {
      await this.api.campaigns.setActiveCampaign.mutate(id);
    } catch (err) {
      this._activeId.set(previous);
      throw err;
    }
  }
}
