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
      signIn: vi.fn().mockResolvedValue(undefined)
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([])
    };

    mockTokenSvc = {
      getPersistence: vi.fn().mockReturnValue(signal(true)),
      setPersistence: vi.fn(),
      clearAll: vi.fn()
    };

    

    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: TokenService, useValue: mockTokenSvc },
        
      ]
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
    expect(component.form.invalid).toBe(true);
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Email is required.');
    expect(mockAuthSvc.signIn).not.toHaveBeenCalled();
  });

  it('should block sign in and show alert if email is invalid format', async () => {
    component.form.controls.email.setValue('invalid-email');
    component.form.controls.password.setValue('validPassword123');
    
    await component.signIn();
    
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please enter a valid email address.');
    expect(mockAuthSvc.signIn).not.toHaveBeenCalled();
  });

  it('should block sign in and show alert if password is too short', async () => {
    component.form.controls.email.setValue('test@example.com');
    component.form.controls.password.setValue('short');
    
    await component.signIn();
    
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Password must be at least 8 characters.');
    expect(mockAuthSvc.signIn).not.toHaveBeenCalled();
  });

  it('should normalize email before signing in', async () => {
    component.form.controls.email.setValue(' Test@Example.com ');
    component.form.controls.password.setValue('validPassword123');
    
    await component.signIn();
    
    expect(component.email.value).toBe('test@example.com');
    expect(mockAuthSvc.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'validPassword123'
    });
  });

  it('should handle sign in errors gracefully', async () => {
    const errorMsg = 'Invalid credentials';
    mockAuthSvc.signIn.mockRejectedValue(new Error(errorMsg));
    
    component.form.controls.email.setValue('test@example.com');
    component.form.controls.password.setValue('validPassword123');
    
    await component.signIn();
    
    expect(mockAlertSvc.showError).toHaveBeenCalledWith(errorMsg);
  });
});
