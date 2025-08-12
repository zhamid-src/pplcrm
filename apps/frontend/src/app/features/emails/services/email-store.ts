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

  /** Cache for email header data with recipients, keyed by email ID */
  private readonly emailHeadersCache = signal<Record<string, any>>({});

  /** Email IDs organized by folder ID for efficient lookup */
  private readonly emailIdsByFolderId = signal<Record<string, string[]>>({});

  /** Normalized email data storage, keyed by email ID */
  private readonly emailsById = signal<Record<string, EmailType>>({});

  /** Email service for API operations */
  private readonly emailsService = inject(EmailsService);

  /** Track emails currently being loaded to prevent duplicate requests */
  private readonly loadingEmails = signal<Set<string>>(new Set());

  // =============================================================================
  // SHARED HELPERS (added to enable code sharing; original comments preserved)
  // =============================================================================

  /** Safely write to a record cache signal */
  private setInCache<T extends Record<string, unknown>>(
    cacheSig: { (): T; update: (fn: (v: T) => T) => void },
    key: string,
    value: unknown,
  ): void {
    cacheSig.update((cache) => ({ ...(cache as Record<string, unknown>), [key]: value }) as T);
  }

  /** Read an Email by key */
  private readEmail(emailKey: string): EmailType | undefined {
    return this.emailsById()[emailKey];
  }

  /** Update a single Email in the store, returning the previous snapshot (for rollback) */
  private patchEmail(emailKey: string, patch: Partial<EmailType>): EmailType | undefined {
    const prev = this.readEmail(emailKey);
    if (!prev) return undefined;
    this.emailsById.update((m) => ({ ...m, [emailKey]: { ...prev, ...patch } }));
    return prev;
  }

  /** Replace a single Email in the store (used by rollback paths) */
  private replaceEmail(emailKey: string, value: EmailType): void {
    this.emailsById.update((m) => ({ ...m, [emailKey]: value }));
  }

  /** Mark an email ID as loading to dedupe concurrent fetches */
  private markLoading(emailKey: string): void {
    this.loadingEmails.update((s) => {
      const n = new Set(s);
      n.add(emailKey);
      return n;
    });
  }

  /** Unmark an email ID as loading */
  private unmarkLoading(emailKey: string): void {
    this.loadingEmails.update((s) => {
      const n = new Set(s);
      n.delete(emailKey);
      return n;
    });
  }

  /**
   * Shared optimistic update flow with automatic rollback and optional refresh steps.
   * `serverCall` is awaited; on failure we restore `prev`.
   */
  private async updateProperty(
    emailKey: string,
    patch: Partial<EmailType>,
    serverCall: () => Promise<unknown>,
    opts?: { refreshFolder?: boolean; refreshCounts?: boolean },
  ): Promise<void> {
    const prev = this.patchEmail(emailKey, patch);
    if (!prev) {
      console.warn(`Email ${emailKey} not found in store`);
      return;
    }
    try {
      await serverCall();

      // Optionally refresh current folder and/or counts after successful server mutation
      const currentFolderId = this.currentSelectedFolderId();
      if (opts?.refreshFolder && currentFolderId) {
        await this.loadEmailsForFolder(currentFolderId);
      }
      if (opts?.refreshCounts) {
        await this.refreshFolderCounts();
      }
    } catch (error) {
      // Rollback on error
      this.replaceEmail(emailKey, prev);
      throw error;
    }
  }

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

    // Get current email assignment for potential rollback
    const currentEmail = this.emailsById()[emailKey];
    if (!currentEmail) {
      console.warn(`Email ${emailKey} not found in store`);
      return;
    }

    const previousEmailState = this.emailsById()[emailKey];
    if (!previousEmailState) return;

    // Optimistic update
    // (shared helper will handle rollback + refresh flows)
    await this.updateProperty(
      emailKey,
      { assigned_to: userId ?? undefined },
      () => this.emailsService.assign(emailKey, userId),
      { refreshFolder: true, refreshCounts: true },
    );
  }

  /**
   * Factory function to get email body content by ID.
   * @param emailId - The email ID to get body content for
   * @returns Computed signal containing the email body HTML or undefined
   */
  public readonly getEmailBodyById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailBodiesCache()[String(emailId)] : undefined));

  /**
   * Factory function to get email by ID.
   * @param emailId - The email ID to retrieve
   * @returns Computed signal containing the email or undefined
   */
  public readonly getEmailById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailsById()[String(emailId)] : undefined));

  /**
   * Factory function to get email header data by ID.
   * @param emailId - The email ID to get header data for
   * @returns Computed signal containing the email header data or undefined
   */
  public readonly getEmailHeaderById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailHeadersCache()[String(emailId)] : undefined));

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

  /**
   * Loads all email folders with email counts from the server.
   * @returns Promise that resolves to the array of folders with counts
   */
  public async loadAllFoldersWithCounts(): Promise<(EmailFolderType & { email_count: number })[]> {
    const folders = (await this.emailsService.getFoldersWithCounts()) as (EmailFolderType & { email_count: number })[];
    this.emailFolders.set(folders);

    // Auto-select the default folder if no folder is currently selected
    if (!this.currentSelectedFolderId() && folders.length > 0) {
      const defaultFolder = folders.find((folder) => folder.is_default);
      if (defaultFolder) {
        this.selectFolder(defaultFolder);
      }
    }

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

  /**
   * Loads email with headers and body content with caching.
   * This method fetches both body and header data in a single call.
   * @param emailId - The ID of the email to load complete data for
   * @returns Promise that resolves to object containing body and header data
   */
  public async loadEmailWithHeaders(emailId: EmailId): Promise<{ body: string; header: any }> {
    const emailKey = String(emailId);
    const cachedBody = this.emailBodiesCache()[emailKey];
    const cachedHeader = this.emailHeadersCache()[emailKey];

    // If both are cached, return cached data immediately
    if (cachedBody && cachedHeader) {
      return { body: cachedBody, header: cachedHeader };
    }

    // Check if this email is already being loaded
    const currentlyLoading = this.loadingEmails();
    if (currentlyLoading.has(emailKey)) {
      // Return cached data if available, or empty data
      return {
        body: cachedBody || '',
        header: cachedHeader || null,
      };
    }

    // Mark as loading
    this.markLoading(emailKey);

    try {
      // Fetch combined data from API
      const response = (await this.emailsService.getEmailWithHeaders(emailKey)) as any;

      if (response) {
        // Batch cache updates to minimize reactive updates
        const bodyHtml = response.body?.body_html || '';
        const headerData = response.header || null;

        // Update caches only if we don't already have the data
        if (bodyHtml && !cachedBody) {
          this.setInCache(this.emailBodiesCache, emailKey, bodyHtml);
        }

        if (headerData && !cachedHeader) {
          this.setInCache(this.emailHeadersCache, emailKey, headerData);
        }

        return {
          body: bodyHtml,
          header: headerData,
        };
      }
    } catch (error) {
      console.error(`Failed to load email data for ${emailKey}:`, error);
    } finally {
      // Remove from loading set
      this.unmarkLoading(emailKey);
    }

    return { body: '', header: null };
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
          status: (serverEmail as any).status || 'open',
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

    this.emailIdsByFolderId.update((folderEmailsMap) => {
      const updatedMap = {
        ...folderEmailsMap,
        [folderKey]: emailsFromServer.map((email) => String(email.id)),
      };
      return updatedMap;
    });
  }

  /**
   * Refresh folder counts after email operations.
   * This should be called after actions that might change email counts.
   */
  public async refreshFolderCounts(): Promise<void> {
    await this.loadAllFoldersWithCounts();
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
    await this.updateProperty(
      emailKey,
      { is_favourite: isFavorite },
      () => this.emailsService.setFavourite(emailKey, isFavorite),
      // no folder recount needed for favourite toggle (kept behavior identical)
      { refreshFolder: false, refreshCounts: false },
    );
  }

  /**
   * Update email status and refresh folder counts.
   * @param emailId - The ID of the email to update
   * @param status - The new status ('open', 'closed', 'resolved')
   */
  public async updateEmailStatus(emailId: EmailId, status: 'open' | 'closed' | 'resolved'): Promise<void> {
    const emailKey = String(emailId);

    // Get current state for potential rollback
    const currentEmail = this.emailsById()[emailKey];
    if (!currentEmail) {
      console.warn(`Email ${emailKey} not found in store`);
      return;
    }

    const previousStatus = currentEmail.status;

    // Optimistically update the local state
    // (shared helper will handle rollback + refresh flows)
    try {
      await this.updateProperty(emailKey, { status }, () => this.emailsService.setStatus(emailKey, status), {
        refreshFolder: true,
        refreshCounts: true,
      });
    } catch (error) {
      // Revert optimistic update on error
      this.emailsById.update((emails) => {
        const revertedEmails = { ...emails };
        if (revertedEmails[emailKey]) {
          revertedEmails[emailKey] = { ...revertedEmails[emailKey], status: previousStatus };
        }
        return revertedEmails;
      });
      throw error;
    }
  }
}

/** Type alias for email/folder identifiers */
type EmailId = string | number;
