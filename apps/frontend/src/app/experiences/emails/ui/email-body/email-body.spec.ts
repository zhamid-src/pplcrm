/**
 * @fileoverview Unit tests for EmailBody component.
 * Tests email body display and loading functionality.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { signal } from '@angular/core';
import { EmailBody } from './email-body';
import { EmailsStore } from '../../services/store/emailstore';
import { EmailType } from 'common/src/lib/models/models';

// Mock sanitize pipe
@Component({
  selector: 'pc-mock-sanitize-pipe',
  template: '{{ value }}',
})
class MockSanitizePipe {
  @Input() value: string = '';
}

describe('EmailBody', () => {
  let component: EmailBody;
  let fixture: ComponentFixture<EmailBody>;
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

  beforeEach(async () => {
    const mockStore = {
      getEmailBodyById: jest.fn().mockReturnValue(() => '<p>Test email body</p>'),
      getEmailHeaderById: jest.fn().mockReturnValue(signal<any>({ attachments: [] })),
      loadEmailWithHeaders: jest.fn().mockResolvedValue({
        body: '<p>Test email body</p>',
        header: {},
      }),
    } as unknown as EmailsStore;

    await TestBed.configureTestingModule({
      declarations: [EmailBody],
      providers: [{ provide: EmailsStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailBody);
    component = fixture.componentInstance;
    mockEmailsStore = TestBed.inject(EmailsStore) as jest.Mocked<EmailsStore>;

    // Set required input via Angular setInput
    fixture.componentRef.setInput('email', mockEmail);
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load email with headers on email change', async () => {
      fixture.detectChanges();

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmailsStore.loadEmailWithHeaders).toHaveBeenCalledWith('1');
    });
  });

  describe('Body Display', () => {
    it('should display email body from store', () => {
      fixture.detectChanges();

      const bodyContent = component['bodyHtml']();
      expect(bodyContent).toBe('<p>Test email body</p>');
    });

    it('should return empty string when no body is available', () => {
      mockEmailsStore.getEmailBodyById.mockReturnValue(() => undefined);
      fixture.detectChanges();

      const bodyContent = component['bodyHtml']();
      expect(bodyContent).toBe('');
    });

    it('should render body content in template', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.innerHTML).toContain('<p>Test email body</p>');
    });
  });

  describe('Attachments Display', () => {
    it('should render attachments when present', () => {
      mockEmailsStore.getEmailHeaderById.mockReturnValue(
        signal<any>({ attachments: [{ id: 'a1', filename: 'file.txt', is_inline: false }] }),
      );
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const attachmentLink = compiled.querySelector('a');
      expect(attachmentLink?.textContent).toContain('file.txt');
    });
  });

  describe('Email Changes', () => {
    it('should reload body when email changes', async () => {
      const newEmail: EmailType = {
        ...mockEmail,
        id: '2',
        subject: 'New Email',
      };

      fixture.detectChanges();

      // Change email
      fixture.componentRef.setInput('email', newEmail);
      fixture.detectChanges();

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmailsStore.loadEmailWithHeaders).toHaveBeenCalledWith('2');
    });

    it('should not load when email is null', async () => {
      fixture.componentRef.setInput('email', null as any);
      fixture.detectChanges();

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmailsStore.loadEmailWithHeaders).not.toHaveBeenCalled();
    });
  });

  describe('Template Structure', () => {
    it('should have correct CSS classes', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('div');
      expect(container.className).toContain('prose');
      expect(container.className).toContain('max-w-none');
      expect(container.className).toContain('break-words');
    });

    it('should use innerHTML binding for body content', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('div');
      expect(container.innerHTML).toBe('<p>Test email body</p>');
    });
  });

  describe('Error Handling', () => {
    it('should handle store errors gracefully', async () => {
      mockEmailsStore.loadEmailWithHeaders.mockRejectedValue(new Error('Store error'));

      fixture.detectChanges();

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not throw error
      expect(component).toBeTruthy();
    });

    it('should handle undefined email body', () => {
      mockEmailsStore.getEmailBodyById.mockReturnValue(() => undefined as any);
      fixture.detectChanges();

      const bodyContent = component['bodyHtml']();
      expect(bodyContent).toBe('');
    });
  });
});
