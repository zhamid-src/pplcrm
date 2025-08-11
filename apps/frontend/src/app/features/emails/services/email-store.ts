/**
 * @fileoverview Centralized state management for email-related data and operations.
 * Provides reactive state management for emails, folders, and UI selections using Angular signals.
 */
import { Injectable, computed, inject, signal } from '@angular/core';

import { EmailsService } from './emails-service';
import type { EmailFolderType, EmailType } from 'common/src/lib/models';

/**
 * Centralized store for managing email application state.
 *
 * This store provides:
 * - Normalized email data storage
 * - Reactive folder and email selection
 * - Cached email body content
 * - Optimistic UI updates for better UX
 *
 * @example
 * ```typescript
 * constructor(private emailStore = inject(EmailsStore)) {
 *   // Access reactive data
 *   this.selectedEmail = this.emailStore.selectedEmail;
 *   this.folderEmails = this.emailStore.emailsInSelectedFolder;
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class EmailsStore {
  /** Cache for email body HTML content, keyed by email ID */
  private readonly emailBodiesCache = signal<Record<string, string>>({});

  /** Available email folders */
  private readonly emailFolders = signal<EmailFolderType[]>([]);

  /** Email IDs organized by folder ID for efficient lookup */
  private readonly emailIdsByFolderId = signal<Record<string, string[]>>({});

  /** Normalized email data storage, keyed by email ID */
  private readonly emailsById = signal<Record<string, EmailType>>({});

  /** Email service for API operations */
  private readonly emailsService = inject(EmailsService);

  // =============================================================================
  // PUBLIC COMPUTED PROPERTIES
  // =============================================================================

  /**
   * All available email folders.
   * @returns Computed signal containing array of email folders
   */
  public readonly allFolders = computed(() => this.emailFolders());

  /** Currently selected email ID */
  public readonly currentSelectedEmailId = signal<string | null>(null);

  /**
   * Currently selected email.
   * @returns Computed signal containing the selected email or null
   */
  public readonly currentSelectedEmail = computed(() => {
    const emailId = this.currentSelectedEmailId();
    return emailId ? this.emailsById()[emailId] : null;
  });

  // =============================================================================
  // UI STATE SIGNALS
  // =============================================================================

  /** Currently selected folder ID */
  public readonly currentSelectedFolderId = signal<string | null>(null);

  /**
   * Emails in the currently selected folder.
   * @returns Computed signal containing array of emails in selected folder
   */
  public readonly emailsInSelectedFolder = computed(() => {
    const currentFolderId = this.currentSelectedFolderId();
    if (!currentFolderId) return [] as EmailType[];

    const emailIds = this.emailIdsByFolderId()[currentFolderId] ?? [];
    const emailsMap = this.emailsById();
    return emailIds.map((id) => emailsMap[id]).filter(Boolean);
  });

  // =============================================================================
  // PUBLIC METHODS - COMMENTS
  // =============================================================================

  /**
   * Adds a comment to an email.
   * @param emailId - The ID of the email to comment on
   * @param authorId - The ID of the user adding the comment
   * @param commentText - The comment text content
   * @returns Promise that resolves when the comment is added
   */
  public async addComment(emailId: EmailId, authorId: string, commentText: string): Promise<any> {
    return this.emailsService.addComment(String(emailId), authorId, commentText);
  }

  // =============================================================================
  // PUBLIC METHODS - EMAIL ASSIGNMENT
  // =============================================================================

  /**
   * Assigns an email to a user with optimistic updates.
   * @param emailId - The ID of the email to assign
   * @param userId - The ID of the user to assign to, or null to unassign
   * @returns Promise that resolves when the assignment is complete
   */
  public async assignEmailToUser(emailId: EmailId, userId: string | null): Promise<void> {
    const emailKey = String(emailId);
    const previousEmailState = this.emailsById()[emailKey];
    if (!previousEmailState) return;

    // Optimistic update
    this.emailsById.update((emailsMap) => ({
      ...emailsMap,
      [emailKey]: { ...previousEmailState, assigned_to: userId ?? undefined },
    }));

    try {
      await this.emailsService.assign(emailKey, userId);
    } catch (error) {
      // Rollback on error
      this.emailsById.update((emailsMap) => ({
        ...emailsMap,
        [emailKey]: previousEmailState,
      }));
      throw error;
    }
  }

  /**
   * Factory function to get email by ID.
   * @param emailId - The email ID to retrieve
   * @returns Computed signal containing the email or undefined
   */
  public readonly getEmailById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailsById()[String(emailId)] : undefined));

  /**
   * Factory function to get email body content by ID.
   * @param emailId - The email ID to get body content for
   * @returns Computed signal containing the email body HTML or undefined
   */
  public readonly getEmailBodyById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailBodiesCache()[String(emailId)] : undefined));

  // =============================================================================
  // PUBLIC METHODS - FOLDER MANAGEMENT
  // =============================================================================

  /**
   * Loads all email folders from the server.
   * @returns Promise that resolves to the array of folders
   */
  public async loadAllFolders(): Promise<EmailFolderType[]> {
    const folders = (await this.emailsService.getFolders()) as EmailFolderType[];
    this.emailFolders.set(folders);
    return folders;
  }

  // =============================================================================
  // PUBLIC METHODS - EMAIL BODY LOADING
  // =============================================================================

  /**
   * Loads email body content with caching.
   * @param emailId - The ID of the email to load body content for
   * @returns Promise that resolves to the email body HTML
   */
  public async loadEmailBody(emailId: EmailId): Promise<string> {
    const emailKey = String(emailId);
    const cachedBody = this.emailBodiesCache()[emailKey];

    if (cachedBody) return cachedBody;

    const response = (await this.emailsService.getEmailBody(emailKey)) as any;
    if (response && response.body_html) {
      this.emailBodiesCache.update((cache) => ({
        ...cache,
        [emailKey]: response.body_html as string,
      }));
      return response.body_html as string;
    }
    return '';
  }

  // =============================================================================
  // PUBLIC METHODS - EMAIL LOADING
  // =============================================================================

  /**
   * Loads emails for a specific folder with data transformation.
   * @param folderId - The ID of the folder to load emails for
   * @returns Promise that resolves when emails are loaded
   */
  public async loadEmailsForFolder(folderId: EmailId): Promise<void> {
    const folderKey = String(folderId);
    const emailsFromServer = await this.emailsService.getEmails(folderKey);

    this.emailsById.update((emailsMap) => {
      const updatedEmailsMap = { ...emailsMap };

      for (const serverEmail of emailsFromServer) {
        // Transform the data to match EmailType interface
        const transformedEmail: EmailType = {
          id: String(serverEmail.id),
          folder_id: String(serverEmail.folder_id),
          updated_at: new Date(serverEmail.updated_at),
          is_favourite: serverEmail.is_favourite,
          from_email: serverEmail.from_email ?? undefined,
          to_email: serverEmail.to_email ?? undefined,
          subject: serverEmail.subject ?? undefined,
          preview: serverEmail.preview ?? undefined,
          assigned_to: serverEmail.assigned_to ?? undefined,
        };
        updatedEmailsMap[String(serverEmail.id)] = transformedEmail;
      }
      return updatedEmailsMap;
    });

    this.emailIdsByFolderId.update((folderEmailsMap) => ({
      ...folderEmailsMap,
      [folderKey]: emailsFromServer.map((email) => String(email.id)),
    }));
  }

  // =============================================================================
  // PUBLIC METHODS - SELECTION MANAGEMENT
  // =============================================================================

  /**
   * Selects an email and updates the current selection state.
   * @param email - The email to select, or null to clear selection
   */
  public selectEmail(email: EmailType | { id: EmailId } | null): void {
    this.currentSelectedEmailId.set(email ? String(email.id) : null);
  }

  /**
   * Selects a folder and loads its emails.
   * @param folder - The folder to select, or null to clear selection
   */
  public selectFolder(folder: EmailFolderType | null): void {
    this.currentSelectedFolderId.set(folder ? String(folder.id) : null);
    if (folder) {
      void this.loadEmailsForFolder(folder.id);
    }
    this.currentSelectedEmailId.set(null);
  }

  // =============================================================================
  // PUBLIC METHODS - EMAIL ACTIONS
  // =============================================================================

  /**
   * Toggles the favorite status of an email with optimistic updates.
   * Provides immediate UI feedback while the server request is in progress.
   * @param emailId - The ID of the email to toggle favorite status
   * @param isFavorite - The new favorite status
   * @returns Promise that resolves when the operation is complete
   */
  public async toggleEmailFavoriteStatus(emailId: EmailId, isFavorite: boolean): Promise<void> {
    const emailKey = String(emailId);
    const previousEmailState = this.emailsById()[emailKey];
    if (!previousEmailState) return;

    // Optimistic update for immediate UI feedback
    this.emailsById.update((emailsMap) => ({
      ...emailsMap,
      [emailKey]: { ...previousEmailState, is_favourite: isFavorite },
    }));

    try {
      await this.emailsService.setFavourite(emailKey, isFavorite);
      // Optional: re-fetch email header if backend might change other fields
      // const updatedEmail = await this.emailsService.getEmailHeader(emailKey);
      // this.emailsById.update(emailsMap => ({ ...emailsMap, [emailKey]: updatedEmail }));
    } catch (error) {
      // Rollback optimistic update on error
      this.emailsById.update((emailsMap) => ({
        ...emailsMap,
        [emailKey]: previousEmailState,
      }));
      throw error;
    }
  }
}

/** Type alias for email/folder identifiers */
type EmailId = string | number;
