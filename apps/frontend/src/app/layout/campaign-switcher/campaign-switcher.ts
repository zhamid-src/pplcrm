import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { CampaignContextService } from '../../services/campaign-context.service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

/**
 * Campaigns §15 — the context switcher. Answers "where am I working?" at all times:
 * shows the active context (office or an election campaign) and lets the user jump
 * between them. Archived campaigns stay listed under a divider — selectable for
 * read-only history, marked as such.
 */
@Component({
  selector: 'pc-campaign-switcher',
  imports: [Icon, RouterLink],
  templateUrl: './campaign-switcher.html',
})
export class CampaignSwitcher implements OnInit {
  protected readonly context = inject(CampaignContextService);
  private readonly alerts = inject(AlertService);

  protected readonly active = this.context.activeCampaign;
  protected readonly activeCampaigns = computed(() => this.context.campaigns().filter((c) => c.status === 'active'));
  protected readonly archivedCampaigns = computed(() =>
    this.context.campaigns().filter((c) => c.status === 'archived'),
  );

  public ngOnInit(): void {
    this.context.ensureLoaded().catch(() => {
      // Sidebar must never block on this; pages fall back to the office context server-side.
    });
  }

  protected kindLabel(kind: string): string {
    return kind === 'office' ? 'Office' : 'Election';
  }

  protected async select(id: string): Promise<void> {
    this.closeDropdown();
    try {
      await this.context.setActive(id);
    } catch (err) {
      this.alerts.showError(getUserErrorMessage(err, 'Could not switch campaign. Please try again.'));
    }
  }

  private closeDropdown(): void {
    // DaisyUI focus-based dropdowns close when the focused element blurs.
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
  }
}
