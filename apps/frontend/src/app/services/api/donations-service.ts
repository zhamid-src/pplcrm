import { Service } from '@angular/core';
import { TRPCService } from './trpc-service';

@Service()
export class DonationsService extends TRPCService<'donations'> {
  public getHistory(personId: string) {
    return this.api.donations.getPersonDonationHistory.query(personId);
  }

  public getStats(personId: string) {
    return this.api.donations.getDonationStats.query(personId);
  }

  public checkEligibility(payload: {
    personId: string;
    amountCents: number;
    address: {
      country?: string;
      state?: string;
    };
  }) {
    return this.api.donations.checkEligibility.query(payload);
  }

  public createCheckout(payload: {
    personId: string;
    amountCents: number;
    address: {
      country?: string;
      state?: string;
    };
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
}
