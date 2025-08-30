/**
 * @fileoverview Unit tests for EmailsService.
 * Tests the email API service functionality including CRUD operations and email management.
 */
import { EmailsService } from './emails-service';

describe('EmailsService', () => {
  let service: EmailsService;
  let mockApi: any;

  const mockEmail = {
    id: '1',
    folder_id: 'folder1',
    from_email: 'test@example.com',
    to_email: 'recipient@example.com',
    subject: 'Test Email',
    preview: 'Test preview',
    is_favourite: false,
    assigned_to: null,
    updated_at: '2023-01-01T00:00:00.000Z',
  };

  const mockFolder = {
    id: 'folder1',
    name: 'Inbox',
    icon: 'inbox',
    color: '#000000',
  };

  const mockEmailBody = {
    id: '1',
    email_id: '1',
    body_html: '<p>Test email body</p>',
    body_text: 'Test email body',
  };

  beforeEach(() => {
    mockApi = {
      emails: {
        getEmails: { query: jest.fn() },
        getFolders: { query: jest.fn() },
        getFoldersWithCounts: { query: jest.fn() },
        getById: { query: jest.fn() },
        add: { mutate: jest.fn() },
        update: { mutate: jest.fn() },
        delete: { mutate: jest.fn() },
        setFavourite: { mutate: jest.fn() },
        setStatus: { mutate: jest.fn() },
        assign: { mutate: jest.fn() },
        getEmailBody: { query: jest.fn() },
        getEmailHeader: { query: jest.fn() },
        getEmailWithHeaders: { query: jest.fn() },
        deleteMany: { mutate: jest.fn() },
        addComment: { mutate: jest.fn() },
        deleteComment: { mutate: jest.fn() },
        getDraft: { query: jest.fn() },
        deleteDraft: { mutate: jest.fn() },
        getAllAttachments: { query: jest.fn() },
        getAttachmentsByEmailId: { query: jest.fn() },
        hasAttachment: { query: jest.fn() },
        hasAttachmentByEmailIds: { query: jest.fn() },
        restoreFromTrash: { mutate: jest.fn() },
      },
    };

    // Create a bare instance without invoking Angular inject()s
    service = Object.create(EmailsService.prototype) as EmailsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Email Operations', () => {
    it('should get emails for a folder', async () => {
      const mockEmails = [mockEmail];
      mockApi.emails.getEmails.query.mockResolvedValue(mockEmails);

      const result = await service.getEmails('folder1');

      expect(mockApi.emails.getEmails.query).toHaveBeenCalledWith({ folderId: 'folder1' });
      expect(result).toEqual(mockEmails);
    });

    it('should set email as favourite', async () => {
      mockApi.emails.setFavourite.mutate.mockResolvedValue(undefined);

      await service.setFavourite('1', true);

      expect(mockApi.emails.setFavourite.mutate).toHaveBeenCalledWith({
        id: '1',
        favourite: true,
      });
    });

    it('should assign email to user', async () => {
      mockApi.emails.assign.mutate.mockResolvedValue(undefined);

      await service.assign('1', 'user123');

      expect(mockApi.emails.assign.mutate).toHaveBeenCalledWith({
        id: '1',
        user_id: 'user123',
      });
    });

    it('should unassign email when userId is null', async () => {
      mockApi.emails.assign.mutate.mockResolvedValue(undefined);

      await service.assign('1', null);

      expect(mockApi.emails.assign.mutate).toHaveBeenCalledWith({
        id: '1',
        user_id: null,
      });
    });

    it('should get email with headers', async () => {
      const mockResponse = {
        body: { body_html: '<p>Test body</p>' },
        header: {
          email: {
            to_list: [{ name: 'John Doe', email: 'john@example.com', pos: 0 }],
            cc_list: [],
            bcc_list: [],
          },
          comments: [],
        },
      };
      mockApi.emails.getEmailWithHeaders.query.mockResolvedValue(mockResponse);

      const result = await service.getEmailWithHeaders('1');

      expect(mockApi.emails.getEmailWithHeaders.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Folder Operations', () => {
    it('should get all folders', async () => {
      const mockFolders = [mockFolder];
      mockApi.emails.getFolders.query.mockResolvedValue(mockFolders);

      const result = await service.getFolders();

      expect(mockApi.emails.getFolders.query).toHaveBeenCalled();
      expect(result).toEqual(mockFolders);
    });
  });

  describe('Email Body Operations', () => {
    it('should get email body by id', async () => {
      mockApi.emails.getEmailBody.query.mockResolvedValue(mockEmailBody);

      const result = await service.getEmailBody('1');

      expect(mockApi.emails.getEmailBody.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEmailBody);
    });

    it('should handle missing email body', async () => {
      mockApi.emails.getEmailBody.query.mockResolvedValue(null);

      const result = await service.getEmailBody('1');

      expect(result).toBeNull();
    });
  });

  describe('Comment Operations', () => {
    it('should add comment to email', async () => {
      const mockComment = {
        id: '1',
        email_id: '1',
        author_id: 'user123',
        comment: 'Test comment',
        created_at: new Date(),
      };
      mockApi.emails.addComment.mutate.mockResolvedValue(mockComment);

      const result = await service.addComment('1', 'user123', 'Test comment');

      expect(mockApi.emails.addComment.mutate).toHaveBeenCalledWith({
        id: '1',
        author_id: 'user123',
        comment: 'Test comment',
      });
      expect(result).toEqual(mockComment);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockApi.emails.getEmails.query.mockRejectedValue(error);

      await expect(service.getEmails('folder1')).rejects.toThrow('API Error');
    });

    it('should handle network errors in favourite toggle', async () => {
      const error = new Error('Network Error');
      mockApi.emails.setFavourite.mutate.mockRejectedValue(error);

      await expect(service.setFavourite('1', true)).rejects.toThrow('Network Error');
    });
  });
});
