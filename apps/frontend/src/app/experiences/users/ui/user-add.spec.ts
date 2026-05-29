import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { AuthUsersService } from '../services/authusers-service';
import { UserAddComponent } from './user-add';

describe('UserAddComponent', () => {
  let component: UserAddComponent;
  let fixture: ComponentFixture<UserAddComponent>;
  let mockUsersSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockUsersSvc = {
      add: vi.fn(),
      triggerRefresh: vi.fn()
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: {}
    };

    await TestBed.configureTestingModule({
      imports: [UserAddComponent],
      providers: [
        { provide: AuthUsersService, useValue: mockUsersSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize empty form state', () => {
    expect(component).toBeTruthy();
    expect(component['payload']()).toEqual({
      email: '',
      first_name: '',
      last_name: '',
      role: ''
    });
    expect(component['form']().invalid()).toBe(true);
  });

  it('should validate email and first_name are required', async () => {
    // Fill first_name, email empty
    component['payload'].set({
      email: '',
      first_name: 'John',
      last_name: '',
      role: ''
    });
    fixture.detectChanges();
    expect(component['form']().invalid()).toBe(true);

    // Fill email (invalid format), first_name filled
    component['payload'].set({
      email: 'not-an-email',
      first_name: 'John',
      last_name: '',
      role: ''
    });
    fixture.detectChanges();
    expect(component['form']().invalid()).toBe(true);

    // Fill email (valid), first_name empty
    component['payload'].set({
      email: 'john@example.com',
      first_name: '',
      last_name: '',
      role: ''
    });
    fixture.detectChanges();
    expect(component['form']().invalid()).toBe(true);

    // Fill both valid
    component['payload'].set({
      email: 'john@example.com',
      first_name: 'John',
      last_name: '',
      role: ''
    });
    fixture.detectChanges();
    expect(component['form']().invalid()).toBe(false);
  });

  it('should prevent submission and mark touched if form is invalid', async () => {
    await component['submit']();
    expect(mockUsersSvc.add).not.toHaveBeenCalled();
    expect(component['form']().touched()).toBe(true);
  });

  it('should send invite and redirect on successful submit', async () => {
    mockUsersSvc.add.mockResolvedValue({ id: 'user-1' });

    component['payload'].set({
      email: 'john@example.com',
      first_name: ' John  ',
      last_name: ' Doe  ',
      role: ' admin '
    });
    fixture.detectChanges();

    await component['submit']();

    expect(mockUsersSvc.add).toHaveBeenCalledWith({
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'admin'
    });
    expect(mockUsersSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Invitation sent');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });

  it('should handle submission errors gracefully', async () => {
    const errorMsg = 'Invite already exists';
    mockUsersSvc.add.mockRejectedValue(new Error(errorMsg));

    component['payload'].set({
      email: 'john@example.com',
      first_name: 'John',
      last_name: '',
      role: ''
    });
    fixture.detectChanges();

    await component['submit']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(errorMsg);
    expect(component['error']()).toBe(errorMsg);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate back to user list on cancel', () => {
    component['cancel']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });
});
