import { Injectable } from '@angular/core';

import { TRPCService } from '../../../services/api/trpc-service';

@Injectable({
  providedIn: 'root',
})
export class ImportsService extends TRPCService<unknown> {
  public list() {
    return this.api.imports.getAll
      .query(undefined, { signal: this.ac.signal })
      .then((rows: any[] | undefined) =>
        (rows ?? []).map((row: any) => ({
          ...row,
          createdAt: row?.createdAt ? new Date(row.createdAt) : new Date(0),
          processedAt: row?.processedAt ? new Date(row.processedAt) : new Date(0),
        })),
      );
  }

  public delete(id: string, deleteContacts: boolean) {
    return this.api.imports.delete.mutate({ id, deleteContacts });
  }
}
