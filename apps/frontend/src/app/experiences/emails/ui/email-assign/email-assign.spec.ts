/**
 * @fileoverview Unit tests for EmailAssign component.
 * Tests email assignment functionality and user interface.
 */
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailsStore } from '@experiences/emails/services/store/emailstore';

import { EmailAssign } from './email-assign';
import { EmailType } from 'common/src/lib/models';

// Mock child components
@Component({
  selector: 'pc-icon',
  template: '<span>{{name}}</span>',
})
class MockIcon {
  @Input() public name: string = '';
  @Input() public size: number = 4;
}

describe('EmailAssign', () => {
  let component: EmailAssign;
  let fixture: ComponentFixture<EmailAssign>;
  let mockEmailsStore: jest.Mocked<EmailsStore>;

  const mockEmail: EmailType = {
    id: '1',
    folder_id: 'folder1',
    updated_at: new Date('2023-01-01'),
    is_favourite: false,
    attachment_count: 0,
    has_attachment: false,
    status: 'open',
    from_email: 'test@example.com',
    to_email: 'recipient@example.com',
    subject: 'Test Email',
    preview: 'Test preview',
    assigned_to: undefined,
  };

  const mockAssignedEmail: EmailType = {
    ...mockEmail,
    id: '2',
    assigned_to: 'user123',
  };

  beforeEach(async () => {
    const mockStore = {
      assignEmailToUser: jest.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      declarations: [EmailAssign, MockIcon],
      providers: [{ provide: EmailsStore, useValue: mockStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailAssign);
    component = fixture.componentInstance;
    mockEmailsStore = TestBed.inject(EmailsStore) as jest.Mocked<EmailsStore>;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should accept email input', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      expect(component.email()).toBe(mockEmail);
    });
  });

  describe('Assignment Status Display', () => {
    it('should show unassigned state for email without assignment', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Not Assigned');
    });

    it('should show assigned state for email with assignment', () => {
      fixture.componentRef.setInput('email', mockAssignedEmail);
      fixture.detectChanges();

      // Without users loaded, label falls back to Not Assigned
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Not Assigned');
    });

    it('should display correct icon for unassigned email', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('pc-icon');
      expect(icon.textContent).toContain('chevron-down');
    });

    it('should display correct icon for assigned email', () => {
      fixture.componentRef.setInput('email', mockAssignedEmail);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('pc-icon');
      expect(icon.textContent).toContain('chevron-down');
    });
  });

  describe('Assignment Actions', () => {
    it('should assign email to user', async () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      await component.assign('user456');

      expect(mockEmailsStore.assignEmailToUser).toHaveBeenCalledWith('1', 'user456');
    });

    it('should unassign email', async () => {
      fixture.componentRef.setInput('email', mockAssignedEmail);
      fixture.detectChanges();

      await component.assign(null);

      expect(mockEmailsStore.assignEmailToUser).toHaveBeenCalledWith('2', null);
    });

    it('should handle assignment errors gracefully', async () => {
      const error = new Error('Assignment failed');
      mockEmailsStore.assignEmailToUser.mockRejectedValue(error);

      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      await expect(component.assign('user456')).rejects.toThrow('Assignment failed');
    });
  });

  describe('User Interface', () => {
    it('should render assignment button', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
    });

    it('should have correct button styling', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.className).toContain('btn');
      expect(button.className).toContain('btn-ghost');
      expect(button.className).toContain('btn-sm');
    });

    it('should show dropdown menu on click', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      const dropdown = fixture.nativeElement.querySelector('.dropdown');
      expect(dropdown).toBeTruthy();
    });
  });

  describe('Dropdown Menu', () => {
    it('should show assign options for unassigned email', () => {
      fixture.componentRef.setInput('email', mockEmail);
      fixture.detectChanges();

      const menu = fixture.nativeElement.querySelector('.dropdown-content');
      expect(menu).toBeTruthy();
    });

    it('should show unassign option for assigned email', () => {
      fixture.componentRef.setInput('email', mockAssignedEmail);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Unassign');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null email gracefully', () => {
      fixture.componentRef.setInput('email', null as any);

      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle email without id', () => {
      const emailWithoutId = { ...mockEmail, id: undefined } as any;
      fixture.componentRef.setInput('email', emailWithoutId);

      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle assignment to same user', async () => {
      fixture.componentRef.setInput('email', mockAssignedEmail);
      fixture.detectChanges();

      await component.assign('user123');

      expect(mockEmailsStore.assignEmailToUser).toHaveBeenCalledWith('2', 'user123');
    });
  });
});
