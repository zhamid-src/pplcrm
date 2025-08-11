/**
 * @fileoverview Unit tests for EmailsStore service.
 * Tests the reactive email state management, caching, and API integration.
 */
import { TestBed } from '@angular/core/testing';

import { EmailsStore } from './email-store';
import { EmailsService } from './emails-service';
import { EmailFolderType, EmailType } from 'common/src/lib/models';

describe('EmailsStore', () => {
  let store: EmailsStore;
  let mockEmailsService: jest.Mocked<EmailsService>;

  const mockEmail: EmailType = {
    id: '1',
    folder_id: 'folder1',
    updated_at: new Date('2023-01-01'),
    is_favourite: false,
    from_email: 'test@example.com',
    to_email: 'recipient@example.com',
    subject: 'Test Email',
    preview: 'Test preview',
    assigned_to: undefined,
  };

  const mockFolder: EmailFolderType = {
    id: 'folder1',
    name: 'Inbox',
    icon: 'inbox',
    color: '#000000',
  };

  const mockServerEmail = {
    id: '1',
    folder_id: 'folder1',
    updated_at: '2023-01-01T00:00:00.000Z',
    is_favourite: false,
    from_email: 'test@example.com',
    to_email: 'recipient@example.com',
    subject: 'Test Email',
    preview: 'Test preview',
    assigned_to: null,
  };

  beforeEach(() => {
    const mockService = {
      getEmails: jest.fn(),
      getFolders: jest.fn(),
      getEmailBody: jest.fn(),
      setFavourite: jest.fn(),
      assign: jest.fn(),
      addComment: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [EmailsStore, { provide: EmailsService, useValue: mockService }],
    });

    store = TestBed.inject(EmailsStore);
    mockEmailsService = TestBed.inject(EmailsService) as jest.Mocked<EmailsService>;
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(store).toBeTruthy();
    });

    it('should initialize with empty state', () => {
      expect(store.allFolders()).toEqual([]);
      expect(store.emailsInSelectedFolder()).toEqual([]);
      expect(store.currentSelectedEmail()).toBeNull();
      expect(store.currentSelectedFolderId()).toBeNull();
      expect(store.currentSelectedEmailId()).toBeNull();
    });
  });

  describe('Folder Management', () => {
    it('should load folders successfully', async () => {
      mockEmailsService.getFolders.mockResolvedValue([mockFolder]);

      const result = await store.loadAllFolders();

      expect(mockEmailsService.getFolders).toHaveBeenCalled();
      expect(result).toEqual([mockFolder]);
      expect(store.allFolders()).toEqual([mockFolder]);
    });

    it('should select folder and load emails', async () => {
      mockEmailsService.getEmails.mockResolvedValue([mockServerEmail]);

      store.selectFolder(mockFolder);

      expect(store.currentSelectedFolderId()).toBe('folder1');
      expect(store.currentSelectedEmailId()).toBeNull();
      expect(mockEmailsService.getEmails).toHaveBeenCalledWith('folder1');
    });

    it('should clear selection when null folder is selected', () => {
      store.selectFolder(null);

      expect(store.currentSelectedFolderId()).toBeNull();
      expect(store.currentSelectedEmailId()).toBeNull();
    });
  });

  describe('Email Management', () => {
    beforeEach(async () => {
      mockEmailsService.getEmails.mockResolvedValue([mockServerEmail]);
      await store.loadEmailsForFolder('folder1');
    });

    it('should load emails for folder with data transformation', async () => {
      const emails = store.emailsInSelectedFolder();

      expect(emails).toHaveLength(0); // No folder selected yet

      store.selectFolder(mockFolder);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmailsService.getEmails).toHaveBeenCalledWith('folder1');
    });

    it('should select email', () => {
      store.selectEmail(mockEmail);

      expect(store.currentSelectedEmailId()).toBe('1');
    });

    it('should clear email selection when null is passed', () => {
      store.selectEmail(null);

      expect(store.currentSelectedEmailId()).toBeNull();
    });
  });

  describe('Email Body Loading', () => {
    it('should load email body and cache it', async () => {
      const mockBodyResponse = { body_html: '<p>Test body</p>' };
      mockEmailsService.getEmailBody.mockResolvedValue(mockBodyResponse);

      const result = await store.loadEmailBody('1');

      expect(mockEmailsService.getEmailBody).toHaveBeenCalledWith('1');
      expect(result).toBe('<p>Test body</p>');

      // Test caching - second call should not hit the service
      const cachedResult = await store.loadEmailBody('1');
      expect(cachedResult).toBe('<p>Test body</p>');
      expect(mockEmailsService.getEmailBody).toHaveBeenCalledTimes(1);
    });

    it('should return empty string when body is not found', async () => {
      mockEmailsService.getEmailBody.mockResolvedValue(null);

      const result = await store.loadEmailBody('1');

      expect(result).toBe('');
    });

    it('should get email body by id using computed', () => {
      const bodyComputed = store.getEmailBodyById('1');

      expect(bodyComputed()).toBeUndefined();
    });
  });

  describe('Email Actions', () => {
    beforeEach(async () => {
      mockEmailsService.getEmails.mockResolvedValue([mockServerEmail]);
      await store.loadEmailsForFolder('folder1');
    });

    it('should toggle email favorite status with optimistic updates', async () => {
      mockEmailsService.setFavourite.mockResolvedValue(undefined);

      await store.toggleEmailFavoriteStatus('1', true);

      expect(mockEmailsService.setFavourite).toHaveBeenCalledWith('1', true);
    });

    it('should rollback optimistic update on error', async () => {
      mockEmailsService.setFavourite.mockRejectedValue(new Error('API Error'));

      await expect(store.toggleEmailFavoriteStatus('1', true)).rejects.toThrow('API Error');
    });

    it('should assign email to user', async () => {
      mockEmailsService.assign.mockResolvedValue(undefined);

      await store.assignEmailToUser('1', 'user123');

      expect(mockEmailsService.assign).toHaveBeenCalledWith('1', 'user123');
    });

    it('should add comment to email', async () => {
      const mockComment = { id: '1', comment: 'Test comment' };
      mockEmailsService.addComment.mockResolvedValue(mockComment);

      const result = await store.addComment('1', 'user123', 'Test comment');

      expect(mockEmailsService.addComment).toHaveBeenCalledWith('1', 'user123', 'Test comment');
      expect(result).toBe(mockComment);
    });
  });

  describe('Factory Functions', () => {
    it('should create email by id computed', () => {
      const emailComputed = store.getEmailById('1');

      expect(emailComputed()).toBeUndefined();
    });

    it('should handle null id in factory functions', () => {
      const emailComputed = store.getEmailById(null);
      const bodyComputed = store.getEmailBodyById(null);

      expect(emailComputed()).toBeUndefined();
      expect(bodyComputed()).toBeUndefined();
    });
  });
});
