/**
 * @fileoverview Unit tests for EmailHeader component.
 * Tests email header display and favorite toggle functionality.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { signal } from '@angular/core';
import { EmailHeader } from './email-header';
import { EmailsStore } from '../services/email-store';
import { EmailType } from 'common/src/lib/models';

// Mock child components
@Component({
  selector: 'pc-icon',
  template: '<span>{{name}}</span>'
})
class MockIcon {
  @Input() name: string = '';
}

@Component({
  selector: 'pc-email-assign',
  template: '<div>Mock Email Assign</div>'
})
class MockEmailAssign {
  @Input() email: EmailType | null = null;
}

describe('EmailHeader', () => {
  let component: EmailHeader;
  let fixture: ComponentFixture<EmailHeader>;
  let mockEmailsStore: jest.Mocked<EmailsStore>;

  const mockEmail: EmailType = {
    id: '1',
    folder_id: 'folder1',
    updated_at: new Date('2023-01-01'),
    is_favourite: false,
    from_email: 'test@example.com',
    to_email: 'recipient@example.com',
    subject: 'Test Email Subject',
    preview: 'Test preview',
    assigned_to: undefined
  };

  const mockFavoriteEmail: EmailType = {
    ...mockEmail,
    id: '2',
    is_favourite: true
  };

  beforeEach(async () => {
    const mockStore = {
      toggleEmailFavoriteStatus: jest.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      declarations: [
        EmailHeader,
        MockIcon,
        MockEmailAssign
      ],
      providers: [
        { provide: EmailsStore, useValue: mockStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmailHeader);
    component = fixture.componentInstance;
    mockEmailsStore = TestBed.inject(EmailsStore) as jest.Mocked<EmailsStore>;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default favorite state', () => {
      expect(component['isFavourite']()).toBe(false);
    });
  });

  describe('Email Input Handling', () => {
    it('should update favorite state when email input changes', () => {
      // Set up the input signal
      component.email = signal(mockEmail);
      fixture.detectChanges();

      expect(component['isFavourite']()).toBe(false);
    });

    it('should handle favorite email input', () => {
      component.email = signal(mockFavoriteEmail);
      fixture.detectChanges();

      expect(component['isFavourite']()).toBe(true);
    });

    it('should handle null email input', () => {
      component.email = signal(null as any);
      fixture.detectChanges();

      // Should not throw error
      expect(component).toBeTruthy();
    });
  });

  describe('Favorite Icon Logic', () => {
    it('should return star-filled icon when email is favorite', () => {
      component['isFavourite'].set(true);

      const icon = component.getFavouriteIcon();

      expect(icon).toBe('star-filled');
    });

    it('should return star icon when email is not favorite', () => {
      component['isFavourite'].set(false);

      const icon = component.getFavouriteIcon();

      expect(icon).toBe('star');
    });
  });

  describe('Favorite Toggle Functionality', () => {
    beforeEach(() => {
      component.email = signal(mockEmail);
      fixture.detectChanges();
    });

    it('should toggle favorite status from false to true', async () => {
      component['isFavourite'].set(false);

      await component['toggleFavourite']();

      expect(component['isFavourite']()).toBe(true);
      expect(mockEmailsStore.toggleEmailFavoriteStatus).toHaveBeenCalledWith('1', true);
    });

    it('should toggle favorite status from true to false', async () => {
      component['isFavourite'].set(true);

      await component['toggleFavourite']();

      expect(component['isFavourite']()).toBe(false);
      expect(mockEmailsStore.toggleEmailFavoriteStatus).toHaveBeenCalledWith('1', false);
    });

    it('should handle toggle errors gracefully', async () => {
      const error = new Error('Toggle failed');
      mockEmailsStore.toggleEmailFavoriteStatus.mockRejectedValue(error);

      await expect(component['toggleFavourite']()).rejects.toThrow('Toggle failed');
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      component.email = signal(mockEmail);
      fixture.detectChanges();
    });

    it('should display email subject', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Test Email Subject');
    });

    it('should display from email', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('test@example.com');
    });

    it('should display to email', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('recipient@example.com');
    });

    it('should display formatted date', () => {
      const compiled = fixture.nativeElement;
      // Check that some date representation is shown
      expect(compiled.textContent).toMatch(/2023|Jan|01/);
    });

    it('should render favorite icon button', () => {
      const favoriteButton = fixture.nativeElement.querySelector('[data-testid="favorite-button"]');
      expect(favoriteButton).toBeTruthy();
    });

    it('should render email assign component', () => {
      const emailAssign = fixture.nativeElement.querySelector('pc-email-assign');
      expect(emailAssign).toBeTruthy();
    });
  });

  describe('Icon Display', () => {
    it('should show correct icon for non-favorite email', () => {
      component.email = signal(mockEmail);
      component['isFavourite'].set(false);
      fixture.detectChanges();

      const icon = component.getFavouriteIcon();
      expect(icon).toBe('star');
    });

    it('should show correct icon for favorite email', () => {
      component.email = signal(mockFavoriteEmail);
      component['isFavourite'].set(true);
      fixture.detectChanges();

      const icon = component.getFavouriteIcon();
      expect(icon).toBe('star-filled');
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      component.email = signal(mockEmail);
      fixture.detectChanges();
    });

    it('should call toggleFavourite when favorite button is clicked', async () => {
      spyOn(component as any, 'toggleFavourite').and.returnValue(Promise.resolve());

      const favoriteButton = fixture.nativeElement.querySelector('[data-testid="favorite-button"]');
      if (favoriteButton) {
        favoriteButton.click();
        expect(component['toggleFavourite']).toHaveBeenCalled();
      }
    });
  });

  describe('Email Assignment Integration', () => {
    it('should pass email to assignment component', () => {
      component.email = signal(mockEmail);
      fixture.detectChanges();

      const emailAssignComponent = fixture.debugElement.query(
        sel => sel.componentInstance instanceof MockEmailAssign
      );
      
      expect(emailAssignComponent.componentInstance.email).toBe(mockEmail);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with missing subject', () => {
      const emailWithoutSubject = { ...mockEmail, subject: undefined };
      component.email = signal(emailWithoutSubject);
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle email with missing from_email', () => {
      const emailWithoutFrom = { ...mockEmail, from_email: undefined };
      component.email = signal(emailWithoutFrom);
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle email with missing to_email', () => {
      const emailWithoutTo = { ...mockEmail, to_email: undefined };
      component.email = signal(emailWithoutTo);
      
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });
});
