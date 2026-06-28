import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { NewPasswordPage } from './new-password-page';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('NewPasswordPage', () => {
  let component: NewPasswordPage;
  let fixture: ComponentFixture<NewPasswordPage>;

  let mockAuthSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockRoute: any;

  beforeEach(async () => {
    mockAuthSvc = {
      resetPassword: vi.fn().mockResolvedValue(null), // returns null on success
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([]),
    };

    mockRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue('mock-reset-code'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [NewPasswordPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true as any);

    fixture = TestBed.createComponent(NewPasswordPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should extract code from URL on init', async () => {
    await component.ngOnInit();
    expect(component['code']).toBe('mock-reset-code');
    expect(component['error']()).toBe(false);
  });

  it('should set error state if code is missing from URL', async () => {
    mockRoute.snapshot.queryParamMap.get.mockReturnValue(null);
    await component.ngOnInit();
    expect(component['code']).toBeNull();
    expect(component['error']()).toBe(true);
  });

  it('should block submit and show error if password is empty or invalid', async () => {
    await component.submit();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please check the password.');
    expect(mockAuthSvc.resetPassword).not.toHaveBeenCalled();
  });

  it('should submit new password, show success, and navigate', async () => {
    await component.ngOnInit(); // to set the code
    component.password.value.set('validPassword123');

    await component.submit();

    expect(mockAuthSvc.resetPassword).toHaveBeenCalledWith({
      code: 'mock-reset-code',
      password: 'validPassword123',
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Password reset successfully. Please sign in again');
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('signin');
  });

  it('should set error state if auth service returns an error object', async () => {
    await component.ngOnInit();
    mockAuthSvc.resetPassword.mockRejectedValue(new Error('Invalid token'));

    component.password.value.set('validPassword123');
    await component.submit();

    expect(component['error']()).toBe(true);
    expect(mockAlertSvc.showSuccess).not.toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
  });
});
