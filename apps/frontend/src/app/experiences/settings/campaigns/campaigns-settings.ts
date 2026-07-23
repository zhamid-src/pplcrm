import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { CampaignContextService } from '../../../services/campaign-context.service';
import { CampaignListItem, CampaignsService } from '../../campaigns/services/campaigns-service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

/**
 * Campaigns §15 — the Workspace settings home for campaign management (admin/owner
 * only, like everything under /workspace). Explains what campaigns are and how
 * members are assigned, lists the contexts, and lets an admin switch the campaign
 * they are working in. Cards, not a datagrid: a tenant has a handful of
 * campaigns, ever. Deep pages (detail, carry-over, add/edit) stay on /campaigns/*.
 */
@Component({
  selector: 'pc-campaigns-settings',
  imports: [RouterLink, Icon, DatePipe],
  templateUrl: './campaigns-settings.html',
})
export class CampaignsSettingsComponent implements OnInit {
  private readonly campaignsSvc = inject(CampaignsService);
  private readonly context = inject(CampaignContextService);
  private readonly alerts = inject(AlertService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly loaded = signal(false);
  protected readonly campaigns = signal<CampaignListItem[]>([]);

  protected readonly activeContextId = this.context.activeCampaignId;
  protected readonly current = computed(() => this.campaigns().filter((c) => c.status === 'active'));
  protected readonly archived = computed(() => this.campaigns().filter((c) => c.status === 'archived'));

  public ngOnInit(): void {
    void this.load();
  }

  protected kindLabel(kind: string): string {
    return kind === 'office' ? 'Office' : 'Election';
  }

  protected async switchTo(campaign: CampaignListItem, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    try {
      await this.context.setActive(String(campaign.id));
      this.alerts.showSuccess(`Now working in ${campaign.name}`);
    } catch (err) {
      this.alerts.showError(getUserErrorMessage(err, 'Could not switch campaign. Please try again.'));
    }
  }

  private async load(): Promise<void> {
    const end = this._loading.begin();
    try {
      const [rows] = await Promise.all([this.campaignsSvc.getSwitcherList(), this.context.ensureLoaded()]);
      this.campaigns.set(rows);
    } catch (err) {
      this.alerts.showError(getUserErrorMessage(err, 'Could not load campaigns'));
    } finally {
      this.loaded.set(true);
      end();
    }
  }
}
