import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { AuthUsersService } from '../services/authusers-service';
import { UserDetailComponent } from './user-detail';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;
  let mockUsersSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockUsersSvc = {
      getById: vi.fn(),
      update: vi.fn()
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('user-123')
        }
      }
    };

    mockUsersSvc.getById.mockResolvedValue({
      id: 'user-123',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'editor',
      verified: true,
      stats: {
        emails_assigned: { total: 5, open: 2, closed: 3 },
        contacts_added: { total: 10, last_created_at: new Date('2026-05-19T20:00:00Z') },
        files_imported: { count: 1, total_rows: 50, last_activity_at: new Date('2026-05-19T20:00:00Z') },
        files_exported: { count: 2, total_rows: 100, last_activity_at: new Date('2026-05-19T20:00:00Z') }
      }
    });

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        { provide: AuthUsersService, useValue: mockUsersSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create and load user details', async () => {
    expect(component).toBeTruthy();
    expect(component['loading']()).toBe(false);
    expect(component['detail']()?.id).toBe('user-123');
    expect(component['payload']()).toEqual({
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'editor',
      verified: true
    });
    expect(component['form']().invalid()).toBe(false);
  });

  it('should validate form and prevent saving if invalid', async () => {
    const emailInput = fixture.nativeElement.querySelector('#email');
    emailInput.value = 'invalid-email';
    emailInput.dispatchEvent(new Event('input'));
    
    const nameInput = fixture.nativeElement.querySelector('#first_name');
    nameInput.value = '';
    nameInput.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    expect(component['form']().invalid()).toBe(true);

    await component['save']();
    expect(mockUsersSvc.update).not.toHaveBeenCalled();
    expect(component['form']().touched()).toBe(true);
  });

  it('should reset form back to loaded values', async () => {
    const nameInput = fixture.nativeElement.querySelector('#first_name');
    nameInput.value = 'Changed';
    nameInput.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    expect(component['form']().dirty()).toBe(true);

    component['resetForm']();
    fixture.detectChanges();

    expect(component['payload']()).toEqual({
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'editor',
      verified: true
    });
    expect(component['form']().dirty()).toBe(false);
  });

  it('should save user details and trigger success alert', async () => {
    mockUsersSvc.update.mockResolvedValue({});
    
    const nameInput = fixture.nativeElement.querySelector('#first_name');
    nameInput.value = 'Johnny';
    nameInput.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();
    expect(component['form']().dirty()).toBe(true);

    await component['save']();

    expect(mockUsersSvc.update).toHaveBeenCalledWith('user-123', {
      email: 'john@example.com',
      first_name: 'Johnny',
      last_name: 'Doe',
      role: 'editor',
      verified: true
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('User updated');
  });

  it('should handle update error gracefully', async () => {
    const errorMsg = 'Failed to update';
    mockUsersSvc.update.mockRejectedValue(new Error(errorMsg));

    const nameInput = fixture.nativeElement.querySelector('#first_name');
    nameInput.value = 'Johnny';
    nameInput.dispatchEvent(new Event('input'));
    
    fixture.detectChanges();

    await component['save']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(errorMsg);
    expect(component['error']()).toBe(errorMsg);
  });

  it('should navigate back on cancel/goBack', () => {
    component['goBack']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });
});
