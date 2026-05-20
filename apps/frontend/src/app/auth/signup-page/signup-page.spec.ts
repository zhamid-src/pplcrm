import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignUpPage } from './signup-page';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SignUpPage', () => {
  let component: SignUpPage;
  let fixture: ComponentFixture<SignUpPage>;

  let mockAuthSvc: any;
  let mockAlertSvc: any;

  beforeEach(async () => {
    mockAuthSvc = {
      signUp: vi.fn().mockResolvedValue({ first_name: 'John' })
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([])
    };

    await TestBed.configureTestingModule({
      imports: [SignUpPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial invalid form state', () => {
    expect(component.form().invalid()).toBe(true);
  });

  it('should block join and show alert if form is invalid', async () => {
    await component.join();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please enter all information before continuing.');
    expect(mockAuthSvc.signUp).not.toHaveBeenCalled();
  });

  it('should submit form and show success when valid', async () => {
    // Fill out the form correctly
    component['signUpData'].set({
      organization: 'Acme Corp',
      email: 'test@example.com',
      password: 'validPassword123',
      first_name: 'John',
      middle_names: '',
      last_name: 'Doe',
      terms: 'true'
    });

    fixture.detectChanges();
    expect(component.form().valid()).toBe(true);

    await component.join();

    expect(mockAuthSvc.signUp).toHaveBeenCalledWith({
      organization: 'Acme Corp',
      email: 'test@example.com',
      password: 'validPassword123',
      first_name: 'John',
      middle_names: '',
      last_name: 'Doe',
      terms: 'true'
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Welcome John!');
  });

  it('should show error if signup returns falsy user', async () => {
    mockAuthSvc.signUp.mockResolvedValue(null);

    component['signUpData'].set({
      organization: 'Acme Corp',
      email: 'test@example.com',
      password: 'validPassword123',
      first_name: 'John',
      middle_names: '',
      last_name: '',
      terms: ''
    });

    fixture.detectChanges();
    await component.join();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Unable to complete signup.');
  });

  it('should show error if signup throws exception', async () => {
    const errorMsg = 'Email already exists';
    mockAuthSvc.signUp.mockRejectedValue(new Error(errorMsg));

    component['signUpData'].set({
      organization: 'Acme Corp',
      email: 'test@example.com',
      password: 'validPassword123',
      first_name: 'John',
      middle_names: '',
      last_name: '',
      terms: ''
    });

    fixture.detectChanges();
    await component.join();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(errorMsg);
  });
});
