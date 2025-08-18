/**
 * @fileoverview Unit tests for EmailClient component.
 * Tests the main email client container component and its interactions with the store.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { EmailClient } from '../email-client';
import { EmailsStore } from '../../services/store/emailstore';
import { EmailType, EmailFolderType } from 'common/src/lib/models';

// Mock child components
@Component({
  selector: 'pc-email-folder-list',
  template: '<div>Mock Folder List</div>',
})
class MockEmailFolderList {
  @Output() folderSelected = new EventEmitter<EmailFolderType>();
}

@Component({
  selector: 'pc-email-list',
  template: '<div>Mock Email List</div>',
})
class MockEmailList {
  @Output() emailSelected = new EventEmitter<EmailType>();
}

@Component({
  selector: 'pc-email-details',
  template: '<div>Mock Email Details</div>',
})
class MockEmailDetails {
  @Input() email: EmailType | null = null;
  @Output() reply = new EventEmitter<EmailType>();
  @Output() replyAll = new EventEmitter<EmailType>();
  @Output() forward = new EventEmitter<EmailType>();
}

describe('EmailClient', () => {
  let component: EmailClient;
  let fixture: ComponentFixture<EmailClient>;
  let mockEmailsStore: jest.Mocked<EmailsStore>;

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

  beforeEach(async () => {
    const mockStore = {
      currentSelectedEmail: jest.fn().mockReturnValue(null),
      currentSelectedFolderId: jest.fn().mockReturnValue(null),
      selectEmail: jest.fn(),
      selectFolder: jest.fn(),
      getEmailHeaderById: jest.fn().mockReturnValue(signal<any>({ email: { to_list: [], cc_list: [] } })),
    } as Partial<EmailsStore>;

    await TestBed.configureTestingModule({
      declarations: [EmailClient, MockEmailFolderList, MockEmailList, MockEmailDetails],
      providers: [{ provide: EmailsStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailClient);
    component = fixture.componentInstance;
    mockEmailsStore = TestBed.inject(EmailsStore) as jest.Mocked<EmailsStore>;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with store computed properties', () => {
      expect(component.selectedEmail).toBeDefined();
      expect(component.selectedFolderId).toBeDefined();
    });

    it('should render child components', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('pc-email-folder-list')).toBeTruthy();
      expect(compiled.querySelector('pc-email-list')).toBeTruthy();
      expect(compiled.querySelector('pc-email-details')).toBeTruthy();
    });
  });

  describe('Email Selection', () => {
    it('should handle email selection from child component', async () => {
      await component.onEmail(mockEmail);

      expect(mockEmailsStore.selectEmail).toHaveBeenCalledWith(mockEmail);
    });

    it('should handle null email selection', async () => {
      await component.onEmail(null as any);

      expect(mockEmailsStore.selectEmail).toHaveBeenCalledWith(null);
    });
  });

  describe('Folder Selection', () => {
    it('should handle folder selection from child component', () => {
      component.onFolder(mockFolder);

      expect(mockEmailsStore.selectFolder).toHaveBeenCalledWith(mockFolder);
    });

    it('should handle null folder selection', () => {
      component.onFolder(null as any);

      expect(mockEmailsStore.selectFolder).toHaveBeenCalledWith(null);
    });
  });

  describe('Template Integration', () => {
    it('should pass selected email to details component', () => {
      mockEmailsStore.currentSelectedEmail.mockReturnValue(mockEmail);
      fixture.detectChanges();

      const emailDetails = fixture.debugElement.query((sel) => sel.componentInstance instanceof MockEmailDetails);
      expect(emailDetails.componentInstance.email).toBe(mockEmail);
    });

    it('should handle folder selection event from template', () => {
      fixture.detectChanges();

      const folderList = fixture.debugElement.query((sel) => sel.componentInstance instanceof MockEmailFolderList);

      spyOn(component, 'onFolder');
      folderList.componentInstance.folderSelected.emit(mockFolder);

      expect(component.onFolder).toHaveBeenCalledWith(mockFolder);
    });

    it('should handle email selection event from template', () => {
      fixture.detectChanges();

      const emailList = fixture.debugElement.query((sel) => sel.componentInstance instanceof MockEmailList);

      spyOn(component, 'onEmail');
      emailList.componentInstance.emailSelected.emit(mockEmail);

      expect(component.onEmail).toHaveBeenCalledWith(mockEmail);
    });
  });

  describe('Component Layout', () => {
    it('should have correct CSS classes for layout', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('div');
      expect(container.className).toContain('flex');
      expect(container.className).toContain('text-sm');
      expect(container.className).toContain('bg-base-100');
      expect(container.className).toContain('h-full');
    });

    it('should apply flex-1 class to email details', () => {
      fixture.detectChanges();

      const emailDetails = fixture.nativeElement.querySelector('pc-email-details');
      expect(emailDetails.className).toContain('flex-1');
      expect(emailDetails.className).toContain('h-full');
    });
  });

  describe('Store Integration', () => {
    it('should use store computed properties for reactive updates', () => {
      // Verify that the component uses the store's computed properties
      expect(component.selectedEmail).toBe(mockEmailsStore.currentSelectedEmail);
      expect(component.selectedFolderId).toBe(mockEmailsStore.currentSelectedFolderId);
    });

    it('should delegate selection operations to store', () => {
      await component.onEmail(mockEmail);
      component.onFolder(mockFolder);

      expect(mockEmailsStore.selectEmail).toHaveBeenCalledWith(mockEmail);
      expect(mockEmailsStore.selectFolder).toHaveBeenCalledWith(mockFolder);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined email gracefully', async () => {
      await expect(component.onEmail(undefined as any)).resolves.toBeUndefined();
      expect(mockEmailsStore.selectEmail).toHaveBeenCalledWith(undefined);
    });

    it('should handle undefined folder gracefully', () => {
      expect(() => component.onFolder(undefined as any)).not.toThrow();
      expect(mockEmailsStore.selectFolder).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Draft behaviour', () => {
    it('saves current draft and closes compose when another email is selected', async () => {
      mockEmailsStore.currentSelectedFolderId.mockReturnValue('1');
      component.isComposing.set(true);
      const saveDraft = jest.fn().mockResolvedValue(undefined);
      (component as any).composer = { saveDraft, form: { dirty: true } };
      await component.onEmail(mockEmail);
      expect(saveDraft).toHaveBeenCalled();
      expect(component.isComposing()).toBe(false);
      expect(mockEmailsStore.selectEmail).toHaveBeenCalledWith(mockEmail);
    });
  });

  describe('Reply and forward actions', () => {
    beforeEach(() => {
      mockEmailsStore.getEmailHeaderById.mockReturnValue(
        signal<any>({ email: { to_list: [{ email: 'recipient@example.com' }], cc_list: [{ email: 'cc@example.com' }] } }),
      );
    });

    it('opens compose with reply prefill', () => {
      component.onReply(mockEmail);
      expect(component['isComposing']()).toBe(true);
      expect(component['composePrefill']()).toEqual({ to: 'test@example.com', subject: 'Re: Test Email' });
    });

    it('opens compose with reply-all prefill', () => {
      component.onReplyAll(mockEmail);
      expect(component['composePrefill']()).toEqual({
        to: 'test@example.com, recipient@example.com, cc@example.com',
        subject: 'Re: Test Email',
      });
    });

    it('opens compose with forward prefill', () => {
      component.onForward(mockEmail);
      expect(component['composePrefill']()).toEqual({ subject: 'Fwd: Test Email' });
    });
  });
});
