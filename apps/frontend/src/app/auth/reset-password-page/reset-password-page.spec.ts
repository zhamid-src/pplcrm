import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordPage } from './reset-password-page';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ResetPasswordPage', () => {
  let component: ResetPasswordPage;
  let fixture: ComponentFixture<ResetPasswordPage>;

  let mockAuthSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockAuthSvc = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined)
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([])
    };

    

    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        
      ]
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true as any);

    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial invalid form state', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('should block submit and show error if email is empty', async () => {
    await component.submit();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please check the email address and try again.');
    expect(mockAuthSvc.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should block submit and show error if email is invalid format', async () => {
    component.form.controls.email.setValue('invalid');
    await component.submit();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please check the email address and try again.');
    expect(mockAuthSvc.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('should submit valid email, show success, and navigate', async () => {
    component.form.controls.email.setValue('test@example.com');
    await component.submit();

    expect(mockAuthSvc.sendPasswordResetEmail).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('signin');
  });

  it('should handle service rejection gracefully', async () => {
    const errorMsg = 'User not found';
    mockAuthSvc.sendPasswordResetEmail.mockRejectedValue(new Error(errorMsg));

    component.form.controls.email.setValue('test@example.com');
    await component.submit();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(errorMsg);
  });
});
