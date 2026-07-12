import { Service } from '@angular/core';
import { TRPCService } from '../../../services/api/trpc-service';

@Service()
export class DemoService extends TRPCService<any> {
  /** Deletes all seeded demo data (starter forms are kept) and clears the tenant's demo flag. */
  public exitDemo() {
    return this.api.demo.exit.mutate();
  }
}
