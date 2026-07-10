import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { CampaignContextService } from '../../../services/campaign-context.service';
import { CampaignListItem, CampaignsService } from '../services/campaigns-service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

/**
 * Campaigns §15 — manage contexts. The office context is permanent; election
 * campaigns are created before a race and archived after it. Cards, not a
 * datagrid: a tenant has a handful of campaigns, ever.
 */
@Component({
  selector: 'pc-campaigns-page',
  imports: [RouterLink, Icon, DatePipe, GridHeaderComponent],
  templateUrl: './campaigns-page.html',
})
export class CampaignsPageComponent implements OnInit {
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
