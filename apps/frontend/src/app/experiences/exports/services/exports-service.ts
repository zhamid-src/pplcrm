import { Service } from '@angular/core';

import type { DataExportRecordType } from '../../../../../../../libs/common/src';
import { TRPCService } from '../../../services/api/trpc-service';

/** Thin service wrapper over the exports tRPC router — used by the merged Import/export History page (spec §17). */
@Service()
export class ExportsService extends TRPCService<unknown> {
  public list(): Promise<DataExportRecordType[]> {
    return this.api.exports.list.query();
  }

  public delete(id: string): Promise<unknown> {
    return this.api.exports.delete.mutate({ id });
  }
}
