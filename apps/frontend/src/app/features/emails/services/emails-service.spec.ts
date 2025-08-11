/**
 * @fileoverview Unit tests for EmailsService.
 * Tests the email API service functionality including CRUD operations and email management.
 */
import { TestBed } from '@angular/core/testing';
import { EmailsService } from './emails-service';
import { TRPCService } from '../../../backend-svc/trpc-service';

describe('EmailsService', () => {
  let service: EmailsService;
  let mockTRPCService: jest.Mocked<TRPCService<'emails'>>;

  const mockEmail = {
    id: '1',
    folder_id: 'folder1',
    from_email: 'test@example.com',
    to_email: 'recipient@example.com',
    subject: 'Test Email',
    preview: 'Test preview',
    is_favourite: false,
    assigned_to: null,
    updated_at: '2023-01-01T00:00:00.000Z'
  };

  const mockFolder = {
    id: 'folder1',
    name: 'Inbox',
    icon: 'inbox',
    color: '#000000'
  };

  const mockEmailBody = {
    id: '1',
    email_id: '1',
    body_html: '<p>Test email body</p>',
    body_text: 'Test email body'
  };

  beforeEach(() => {
    const mockApi = {
      emails: {
        getAll: { query: jest.fn() },
        getById: { query: jest.fn() },
        add: { mutate: jest.fn() },
        update: { mutate: jest.fn() },
        delete: { mutate: jest.fn() },
        setFavourite: { mutate: jest.fn() },
        assign: { mutate: jest.fn() }
      },
      emailFolders: {
        getAll: { query: jest.fn() }
      },
      emailBodies: {
        getById: { query: jest.fn() }
      },
      emailComments: {
        add: { mutate: jest.fn() }
      }
    };

    TestBed.configureTestingModule({
      providers: [
        EmailsService,
        { provide: TRPCService, useValue: { api: mockApi } }
      ]
    });

    service = TestBed.inject(EmailsService);
    mockTRPCService = TestBed.inject(TRPCService) as any;
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Email Operations', () => {
    it('should get emails for a folder', async () => {
      const mockEmails = [mockEmail];
      (mockTRPCService as any).api.emails.getAll.query.mockResolvedValue(mockEmails);

      const result = await service.getEmails('folder1');

      expect((mockTRPCService as any).api.emails.getAll.query).toHaveBeenCalledWith('folder1');
      expect(result).toEqual(mockEmails);
    });

    it('should get email by id', async () => {
      (mockTRPCService as any).api.emails.getById.query.mockResolvedValue(mockEmail);

      const result = await service.getById('1');

      expect((mockTRPCService as any).api.emails.getById.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEmail);
    });

    it('should set email as favourite', async () => {
      (mockTRPCService as any).api.emails.setFavourite.mutate.mockResolvedValue(undefined);

      await service.setFavourite('1', true);

      expect((mockTRPCService as any).api.emails.setFavourite.mutate).toHaveBeenCalledWith({
        id: '1',
        is_favourite: true
      });
    });

    it('should assign email to user', async () => {
      (mockTRPCService as any).api.emails.assign.mutate.mockResolvedValue(undefined);

      await service.assign('1', 'user123');

      expect((mockTRPCService as any).api.emails.assign.mutate).toHaveBeenCalledWith({
        id: '1',
        assigned_to: 'user123'
      });
    });

    it('should unassign email when userId is null', async () => {
      (mockTRPCService as any).api.emails.assign.mutate.mockResolvedValue(undefined);

      await service.assign('1', null);

      expect((mockTRPCService as any).api.emails.assign.mutate).toHaveBeenCalledWith({
        id: '1',
        assigned_to: null
      });
    });
  });

  describe('Folder Operations', () => {
    it('should get all folders', async () => {
      const mockFolders = [mockFolder];
      (mockTRPCService as any).api.emailFolders.getAll.query.mockResolvedValue(mockFolders);

      const result = await service.getFolders();

      expect((mockTRPCService as any).api.emailFolders.getAll.query).toHaveBeenCalled();
      expect(result).toEqual(mockFolders);
    });
  });

  describe('Email Body Operations', () => {
    it('should get email body by id', async () => {
      (mockTRPCService as any).api.emailBodies.getById.query.mockResolvedValue(mockEmailBody);

      const result = await service.getEmailBody('1');

      expect((mockTRPCService as any).api.emailBodies.getById.query).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEmailBody);
    });

    it('should handle missing email body', async () => {
      (mockTRPCService as any).api.emailBodies.getById.query.mockResolvedValue(null);

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
        created_at: new Date()
      };
      (mockTRPCService as any).api.emailComments.add.mutate.mockResolvedValue(mockComment);

      const result = await service.addComment('1', 'user123', 'Test comment');

      expect((mockTRPCService as any).api.emailComments.add.mutate).toHaveBeenCalledWith({
        email_id: '1',
        author_id: 'user123',
        comment: 'Test comment'
      });
      expect(result).toEqual(mockComment);
    });
  });

  describe('Abstract API Service Implementation', () => {
    it('should implement add method', async () => {
      const newEmail = {
        folder_id: 'folder1',
        from_email: 'new@example.com',
        subject: 'New Email'
      };
      (mockTRPCService as any).api.emails.add.mutate.mockResolvedValue(mockEmail);

      const result = await service.add(newEmail);

      expect((mockTRPCService as any).api.emails.add.mutate).toHaveBeenCalledWith(newEmail);
      expect(result).toEqual(mockEmail);
    });

    it('should implement update method', async () => {
      const updateData = { subject: 'Updated Subject' };
      (mockTRPCService as any).api.emails.update.mutate.mockResolvedValue([mockEmail]);

      const result = await service.update('1', updateData);

      expect((mockTRPCService as any).api.emails.update.mutate).toHaveBeenCalledWith({
        id: '1',
        ...updateData
      });
      expect(result).toEqual([mockEmail]);
    });

    it('should implement delete method', async () => {
      (mockTRPCService as any).api.emails.delete.mutate.mockResolvedValue(true);

      const result = await service.delete('1');

      expect((mockTRPCService as any).api.emails.delete.mutate).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      (mockTRPCService as any).api.emails.getAll.query.mockRejectedValue(error);

      await expect(service.getEmails('folder1')).rejects.toThrow('API Error');
    });

    it('should handle network errors in favourite toggle', async () => {
      const error = new Error('Network Error');
      (mockTRPCService as any).api.emails.setFavourite.mutate.mockRejectedValue(error);

      await expect(service.setFavourite('1', true)).rejects.toThrow('Network Error');
    });
  });
});
