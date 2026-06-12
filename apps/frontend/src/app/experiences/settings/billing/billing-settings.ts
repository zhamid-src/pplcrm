import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { TRPCService } from '../../../services/api/trpc-service';

export interface BillingDetailsSnapshot {
  plan: string;
  status: string;
  endsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  hasActiveSubscription: boolean;
  isMockMode: boolean;
}

@Component({
  selector: 'pc-billing-settings',
  imports: [DatePipe, Icon],
  templateUrl: './billing-settings.html',
})
export class BillingSettingsComponent extends TRPCService<any> implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly actionPending = signal(false);
  protected readonly details = signal<BillingDetailsSnapshot | null>(null);

  ngOnInit(): void {
    void this.initBilling();
  }

  private async initBilling() {
    await this.loadBilling();

    // Listen to query params for mock successes or redirect callbacks
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (params) => {
      if (params['mock_checkout_success'] && params['plan']) {
        const plan = params['plan'] as 'grassroots' | 'representative';
        await this.handleMockActivation(plan);
      } else if (params['checkout_success']) {
        this.alerts.showSuccess('Subscription activated successfully! Thank you for your purchase.');
        this.clearQueryParams();
      } else if (params['mock_portal_success']) {
        this.alerts.showSuccess('Simulated Customer Portal: Retrieved successfully.');
        this.clearQueryParams();
      }
    });
  }

  protected async loadBilling() {
    const end = this._loading.begin();
    try {
      const data = await this.api.billing.getDetails.query();
      this.details.set(data);
    } catch (err: any) {
      console.error(err);
      this.alerts.showError(err.message || 'Failed to load subscription details.');
    } finally {
      end();
    }
  }

  protected async subscribe(plan: 'grassroots' | 'representative') {
    this.actionPending.set(true);
    try {
      const res = await this.api.billing.createCheckout.mutate({ plan });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error('No redirect URL returned from billing engine.');
      }
    } catch (err: any) {
      this.alerts.showError(err.message || 'Checkout failed. Please try again.');
      this.actionPending.set(false);
    }
  }

  protected async openPortal() {
    this.actionPending.set(true);
    try {
      const res = await this.api.billing.createPortal.mutate();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error('No redirect URL returned from billing portal.');
      }
    } catch (err: any) {
      this.alerts.showError(err.message || 'Could not open billing portal.');
      this.actionPending.set(false);
    }
  }

  private async handleMockActivation(plan: 'grassroots' | 'representative') {
    const end = this._loading.begin();
    try {
      await this.api.billing.activateMockPlan.mutate({ plan });
      this.alerts.showSuccess(`Success! [Mock Mode] activated your "${plan.toUpperCase()}" plan.`);
      await this.loadBilling();
    } catch (err: any) {
      this.alerts.showError(err.message || 'Mock plan activation failed.');
    } finally {
      end();
      this.clearQueryParams();
    }
  }

  protected async cancelMock() {
    const end = this._loading.begin();
    try {
      await this.api.billing.cancelMockPlan.mutate();
      this.alerts.showSuccess('Mock subscription has been canceled.');
      await this.loadBilling();
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to cancel mock plan.');
    } finally {
      end();
    }
  }

  private clearQueryParams() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mock_checkout_success: null,
        plan: null,
        checkout_success: null,
        mock_portal_success: null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
