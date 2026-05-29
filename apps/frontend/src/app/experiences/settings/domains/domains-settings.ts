import { Component, signal, computed, inject, OnInit, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';

export interface VerifiedDomain {
  domain: string;
  status: 'verified' | 'pending';
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}

@Component({
  selector: 'pc-domains-settings',
  imports: [FormsModule, Icon],
  templateUrl: './domains-settings.html',
})
export class DomainSettingsComponent implements OnInit {
  private readonly settingsSvc = inject(SettingsService);
  private readonly alerts = inject(AlertService);

  protected readonly newDomain = signal('');
  protected readonly addingDomain = signal(false);
  protected readonly verifyingDomain = signal<string | null>(null);
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
      const newEntry: VerifiedDomain = {
        domain: domainVal,
        status: 'pending',
        spf: false,
        dkim: false,
        dmarc: false,
      };

      const updatedList = [...currentList, newEntry];
      await this.settingsSvc.upsert([
        { key: 'communications.verified_domains', value: updatedList },
      ]);

      this.newDomain.set('');
      this.expandedDomain.set(domainVal); // Auto-expand to show DNS records
      this.alerts.showSuccess(`Domain ${domainVal} added successfully.`);
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to add domain.');
    } finally {
      this.addingDomain.set(false);
    }
  }

  protected async verifyDomain(domainName: string) {
    this.verifyingDomain.set(domainName);

    // Simulate verification check
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const currentList = this.domainsList();
      const updatedList = currentList.map((d) => {
        if (d.domain === domainName) {
          return {
            ...d,
            status: 'verified' as const,
            spf: true,
            dkim: true,
            dmarc: true,
          };
        }
        return d;
      });

      await this.settingsSvc.upsert([
        { key: 'communications.verified_domains', value: updatedList },
      ]);

      this.alerts.showSuccess(`Domain ${domainName} has been successfully verified!`);
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to verify domain.');
    } finally {
      this.verifyingDomain.set(null);
    }
  }

  protected async deleteDomain(domainName: string) {
    if (!confirm(`Are you sure you want to remove the domain ${domainName}?`)) return;

    try {
      const currentList = this.domainsList();
      const updatedList = currentList.filter((d) => d.domain !== domainName);

      await this.settingsSvc.upsert([
        { key: 'communications.verified_domains', value: updatedList },
      ]);

      this.alerts.showSuccess(`Domain ${domainName} removed.`);
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to remove domain.');
    }
  }
}
