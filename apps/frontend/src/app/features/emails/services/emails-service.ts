/**
 * @file Service for interacting with the email backend via tRPC.
 */
import { Injectable } from '@angular/core';

import { TRPCService } from '../../../backend-svc/trpc-service';

/** Service for interacting with email backend via tRPC */
@Injectable({ providedIn: 'root' })
export class EmailsService extends TRPCService<'emails' | 'email_folders' | 'email_list'> {
  /**
   * Add a comment to an email.
   * @param id Email identifier
   * @param author_id ID of the user adding the comment
   * @param comment Comment text
   * @returns Promise for the mutation
   */
  public addComment(id: string, author_id: string, comment: string) {
    return this.api.emails.addComment.mutate({ id, author_id, comment });
  }

  /**
   * Assign an email to a user.
   * @param id Email identifier
   * @param user_id User ID to assign to
   * @returns Promise for the mutation
   */
  public assign(id: string, user_id: string | null) {
    return this.api.emails.assign.mutate({ id, user_id });
  }

  public getEmailBody(id: string) {
    return this.api.emails.getEmailBody.query(id);
  }

  /**
   * Get a single email by its ID.
   * @param id Email identifier
   * @returns Promise resolving to the email details
   */
  public getEmailHeader(id: string) {
    return this.api.emails.getEmailHeader.query(id);
  }

  /**
   * Fetch all emails for a given folder.
   * @param folderId Identifier of the folder to query
   * @returns Promise resolving to the emails in the folder
   */
  // TODO: paging and infinite scrolling
  public getEmails(folderId: string) {
    return this.api.emails.getEmails.query({ folderId });
  }

  /**
   * Retrieve the list of available email folders.
   * @returns Promise resolving to an array of folders
   */
  public getFolders() {
    return this.api.emails.getFolders.query();
  }

  public setFavourite(id: string, favourite: boolean) {
    return this.api.emails.setFavourite.mutate({ id, favourite });
  }
}
