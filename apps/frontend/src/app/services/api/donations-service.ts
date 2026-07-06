import { Service } from '@angular/core';
import { TRPCService } from './trpc-service';

@Service()
export class DonationsService extends TRPCService<'donations'> {
  // ── One-time donations ──────────────────────────────────────────────────────

  public listDonations() {
    return this.api.donations.listDonations.query();
  }

  public getHistory(personId: string) {
    return this.api.donations.getPersonDonationHistory.query(personId);
  }

  public getStats(personId: string) {
    return this.api.donations.getDonationStats.query(personId);
  }

  public checkEligibility(payload: {
    personId: string;
    amountCents: number;
    address: { country?: string; state?: string };
    isRecurring?: boolean;
    remainingMonths?: number;
  }) {
    return this.api.donations.checkEligibility.query(payload);
  }

  public createCheckout(payload: {
    personId: string;
    amountCents: number;
    address: { country?: string; state?: string };
  }) {
    return this.api.donations.createCheckout.mutate(payload);
  }

  public confirmDonation(sessionId: string) {
    return this.api.donations.confirmDonation.mutate({ sessionId });
  }

  public confirmMockDonation(payload: {
    personId: string;
    amountCents: number;
    sessionId: string;
    province: string;
    country: string;
  }) {
    return this.api.donations.confirmMockDonation.mutate(payload);
  }

  // ── Recurring pledges ───────────────────────────────────────────────────────

  public createRecurringCheckout(payload: {
    personId: string;
    monthlyAmountCents: number;
    address: { country?: string; state?: string };
  }) {
    return this.api.donations.createRecurringCheckout.mutate(payload);
  }

  public confirmMockPledge(payload: {
    personId: string;
    monthlyAmountCents: number;
    mockSubId: string;
    province: string;
    country: string;
  }) {
    return this.api.donations.confirmMockPledge.mutate(payload);
  }

  public listPledges() {
    return this.api.donations.listPledges.query();
  }

  public getPersonPledges(personId: string) {
    return this.api.donations.getPersonPledges.query(personId);
  }

  public cancelPledge(pledgeId: string) {
    return this.api.donations.cancelPledge.mutate({ pledgeId });
  }

  // ── Donation periods ────────────────────────────────────────────────────────

  public getDonationPeriods() {
    return this.api.donations.getDonationPeriods.query();
  }

  public createDonationPeriod(payload: {
    name: string;
    start_date: string;
    end_date?: string | null;
    limit_amount: number;
  }) {
    return this.api.donations.createDonationPeriod.mutate(payload);
  }

  public updateDonationPeriod(payload: {
    id: string;
    name?: string;
    start_date?: string;
    end_date?: string | null;
    limit_amount?: number;
    is_active?: boolean;
  }) {
    return this.api.donations.updateDonationPeriod.mutate(payload);
  }

  public deleteDonationPeriod(id: string) {
    return this.api.donations.deleteDonationPeriod.mutate({ id });
  }

  // ── Webhook token (stored hashed, shown once) ────────────────────────────────

  public getWebhookTokenStatus() {
    return this.api.donations.getWebhookTokenStatus.query();
  }

  public regenerateWebhookToken() {
    return this.api.donations.regenerateWebhookToken.mutate();
  }
}
