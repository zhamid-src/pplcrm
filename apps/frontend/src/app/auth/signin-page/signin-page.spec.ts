import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignInPage } from './signin-page';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TokenService } from '../../services/api/token-service';
import { Router, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';

describe('SignInPage', () => {
  let component: SignInPage;
  let fixture: ComponentFixture<SignInPage>;

  let mockAuthSvc: any;
  let mockAlertSvc: any;
  let mockTokenSvc: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockAuthSvc = {
      getUserSignal: vi.fn().mockReturnValue(signal(null)),
      signIn: vi.fn().mockResolvedValue({ requires2FA: false, user: null }),
      verify2FA: vi.fn().mockResolvedValue(undefined),
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([]),
    };

    mockTokenSvc = {
      getPersistence: vi.fn().mockReturnValue(signal(true)),
      setPersistence: vi.fn(),
      clearAll: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: TokenService, useValue: mockTokenSvc },
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate').mockResolvedValue(true as any);

    fixture = TestBed.createComponent(SignInPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to summary if user is already logged in', () => {
    // Override the mock before creating component instance
    mockAuthSvc.getUserSignal.mockReturnValue(signal({ id: '123' }));

    // Re-create component to trigger the constructor effect
    const fixture2 = TestBed.createComponent(SignInPage);
    fixture2.detectChanges(); // triggers the effect

    expect(mockRouter.navigate).toHaveBeenCalledWith(['summary']);
  });

  it('should toggle token persistence', () => {
    const mockEvent = { checked: false } as any;
    component.togglePersistence(mockEvent);
    expect(mockTokenSvc.setPersistence).toHaveBeenCalledWith(false);
  });

  it('should block sign in and show alert if form is empty', async () => {
    await component.signIn();

    expect(mockTokenSvc.clearAll).toHaveBeenCalled();
    expect(component.form().invalid()).toBe(true);
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Email is required.');
    expect(mockAuthSvc.signIn).not.toHaveBeenCalled();
  });

  it('should block sign in and show alert if email is invalid format', async () => {
    component.email.value.set('invalid-email');
    component.password.value.set('validPassword123');

    await component.signIn();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please enter a valid email address.');
    expect(mockAuthSvc.signIn).not.toHaveBeenCalled();
  });

  it('should block sign in and show alert if password is too short', async () => {
    component.email.value.set('test@example.com');
    component.password.value.set('short');

    await component.signIn();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Password must be at least 8 characters.');
    expect(mockAuthSvc.signIn).not.toHaveBeenCalled();
  });

  it('should normalize email before signing in', async () => {
    component.email.value.set(' Test@Example.com ');
    component.password.value.set('validPassword123');

    await component.signIn();

    expect(component.email.value()).toBe('test@example.com');
    expect(mockAuthSvc.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'validPassword123',
    });
  });

  it('should handle sign in errors gracefully', async () => {
    const errorMsg = 'Invalid credentials';
    mockAuthSvc.signIn.mockRejectedValue(new Error(errorMsg));

    component.email.value.set('test@example.com');
    component.password.value.set('validPassword123');

    await component.signIn();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(errorMsg);
  });

  it('should call signIn only once on form submit via button click', async () => {
    component.email.value.set('test@example.com');
    component.password.value.set('validPassword123');
    fixture.detectChanges();

    const signInSpy = vi.spyOn(component, 'signIn');
    const buttonEl = fixture.nativeElement.querySelector('button[type="submit"]');
    buttonEl.click();
    fixture.detectChanges();

    expect(signInSpy).toHaveBeenCalledTimes(1);
  });

  it('should switch to 2FA view when signIn requires 2FA', async () => {
    mockAuthSvc.signIn.mockResolvedValue({ requires2FA: true, email: 'test@example.com' });

    component.email.value.set('test@example.com');
    component.password.value.set('validPassword123');

    await component.signIn();

    expect(component.requires2FA()).toBe(true);
    expect(component.emailFor2FA()).toBe('test@example.com');
  });

  it('should verify 2FA successfully', async () => {
    component.requires2FA.set(true);
    component.emailFor2FA.set('test@example.com');
    component.code.value.set('123456');

    await component.verify2FA();

    expect(mockAuthSvc.verify2FA).toHaveBeenCalledWith({
      email: 'test@example.com',
      code: '123456',
    });
  });

  it('should block 2FA verification if code is invalid pattern', async () => {
    component.requires2FA.set(true);
    component.emailFor2FA.set('test@example.com');
    component.code.value.set('abc');

    await component.verify2FA();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Verification code must be exactly 6 digits.');
    expect(mockAuthSvc.verify2FA).not.toHaveBeenCalled();
  });

  it('should cancel 2FA flow and reset fields', () => {
    component.requires2FA.set(true);
    component.emailFor2FA.set('test@example.com');
    component.code.value.set('123456');

    component.cancel2FA();

    expect(component.requires2FA()).toBe(false);
    expect(component.emailFor2FA()).toBe('');
    expect(component.code.value()).toBe('');
  });
});
