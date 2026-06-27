import { Service } from '@angular/core';

import { TRPCService } from '../../services/api/trpc-service';

@Service()
export class ConfirmSubscriptionService extends TRPCService<unknown> {
  public async confirmSubscription(token: string) {
    return this.api.webForms.confirmSubscription.mutate({ token });
  }
}
