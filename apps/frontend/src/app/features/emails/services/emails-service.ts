import { Injectable } from '@angular/core';

import { TRPCService } from '../../../backend-svc/trpc-service';

/** Service for interacting with email backend via tRPC */
@Injectable({ providedIn: 'root' })
export class EmailsService extends TRPCService<'emails'> {
  getFolders() {
    return this.api.emails.getFolders.query();
  }

  getEmails(folderId: string) {
    return this.api.emails.getEmails.query({ folderId });
  }

  getEmail(id: string) {
    return this.api.emails.getEmail.query(id);
  }

  addComment(id: string, author_id: string, comment: string) {
    return this.api.emails.addComment.mutate({ id, author_id, comment });
  }

  assign(id: string, user_id: string) {
    return this.api.emails.assign.mutate({ id, user_id });
  }
}
