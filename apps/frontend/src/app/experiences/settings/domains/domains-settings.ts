import { Component, signal, computed, inject, OnInit, linkedSignal } from '@angular/core';
import { SettingsService } from '../services/settings-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

export interface DNSVerificationRecord {
  host: string;
  type: string;
  data: string;
  valid: boolean;
}

export interface VerifiedDomain {
  domain: string;
  status: 'verified' | 'pending';
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  domainAuthId?: number;
  linkBrandingId?: number;
  domainAuthDns?: {
    mail_cname?: DNSVerificationRecord;
    dkim1?: DNSVerificationRecord;
    dkim2?: DNSVerificationRecord;
  };
  linkBrandingDns?: {
    domain?: DNSVerificationRecord;
  };
  linkBranded?: boolean;
}

@Component({
  selector: 'pc-domains-settings',
  imports: [Icon],
  templateUrl: './domains-settings.html',
})
export class DomainSettingsComponent implements OnInit {
  private readonly settingsSvc = inject(SettingsService);
  private readonly alerts = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);

  protected readonly newDomain = signal('');
  protected readonly addingDomain = signal(false);
  protected readonly verifyingDomain = signal<string | null>(null);
  protected readonly lastDomainVerificationTimes = signal<Record<string, number>>({});
  protected readonly domainCooldownSeconds = signal<Record<string, number>>({});
  protected readonly expandedDomain = linkedSignal<VerifiedDomain[], string | null>({
    source: () => this.domainsList(),
    computation: (list, prev) => {
      const prevVal = prev?.value;
      if (prevVal && list.some((d) => d.domain === prevVal)) {
        return prevVal;
      }
      return null;
    },
  });

  protected readonly domainsList = computed<VerifiedDomain[]>(() => {
    return this.settingsSvc.getValue<VerifiedDomain[]>('communications.verified_domains') || [];
  });

  ngOnInit() {
    // Ensure settings are loaded
    void this.settingsSvc.load();
  }

  protected toggleExpand(domainName: string) {
    if (this.expandedDomain() === domainName) {
      this.expandedDomain.set(null);
    } else {
      this.expandedDomain.set(domainName);
    }
  }

  protected async addDomain() {
    const domainVal = this.newDomain().trim().toLowerCase();
    if (!domainVal) return;

    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/i;
    if (!domainRegex.test(domainVal)) {
      this.alerts.showError('Please provide a valid domain name (e.g. example.com).');
      return;
    }

    const currentList = this.domainsList();
    if (currentList.some((d) => d.domain === domainVal)) {
      this.alerts.showError('This domain is already added.');
      return;
    }

    this.addingDomain.set(true);

    try {
      await this.settingsSvc.addVerifiedDomain(domainVal);
      this.newDomain.set('');
      this.expandedDomain.set(domainVal); // Auto-expand to show DNS records
      this.alerts.showSuccess(`Domain ${domainVal} added successfully. Please configure DNS records.`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to add domain.';
      this.alerts.showError(errMsg);
    } finally {
      this.addingDomain.set(false);
    }
  }

  protected isDomainVerifyCooldown(domainName: string): boolean {
    const lastTime = this.lastDomainVerificationTimes()[domainName];
    if (!lastTime) return false;
    return Date.now() - lastTime < 60000;
  }

  private startDomainCooldown(domainName: string) {
    this.domainCooldownSeconds.update((prev) => ({ ...prev, [domainName]: 60 }));
    const interval = setInterval(() => {
      const current = this.domainCooldownSeconds()[domainName] || 0;
      if (current <= 1) {
        clearInterval(interval);
        this.domainCooldownSeconds.update((prev) => {
          const next = { ...prev };
          delete next[domainName];
          return next;
        });
      } else {
        this.domainCooldownSeconds.update((prev) => ({ ...prev, [domainName]: current - 1 }));
      }
    }, 1000);
  }

  protected async verifyDomain(domainName: string) {
    if (this.isDomainVerifyCooldown(domainName)) {
      this.alerts.showError('Please wait at least one minute before verifying this domain again.');
      return;
    }

    this.verifyingDomain.set(domainName);

    try {
      const updatedList = (await this.settingsSvc.verifyVerifiedDomain(domainName)) as VerifiedDomain[];
      this.lastDomainVerificationTimes.update((prev) => ({
        ...prev,
        [domainName]: Date.now(),
      }));
      this.startDomainCooldown(domainName);
      const updatedDomain = updatedList.find((d: VerifiedDomain) => d.domain === domainName);

      if (updatedDomain && updatedDomain.status === 'verified') {
        this.alerts.showSuccess(`Domain ${domainName} has been successfully verified!`);
      } else {
        this.alerts.showWarn(`DNS check completed for ${domainName}. Some records are still pending verification.`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to verify domain.';
      this.alerts.showError(errMsg);
    } finally {
      this.verifyingDomain.set(null);
    }
  }

  protected async deleteDomain(domainName: string) {
    const confirmed = await this.dialogs.confirm({
      title: 'Remove Domain',
      message: `Are you sure you want to remove the domain ${domainName}?`,
      variant: 'danger',
      confirmText: 'Remove',
    });
    if (!confirmed) return;

    try {
      await this.settingsSvc.deleteVerifiedDomain(domainName);
      this.alerts.showSuccess(`Domain ${domainName} removed.`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to remove domain.';
      this.alerts.showError(errMsg);
    }
  }
}
