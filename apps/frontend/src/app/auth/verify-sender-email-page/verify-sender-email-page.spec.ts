import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { VerifySenderEmailPage } from './verify-sender-email-page';
import { SettingsService } from '../../experiences/settings/services/settings-service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCClientError } from '@trpc/client';

describe('VerifySenderEmailPage', () => {
  let component: VerifySenderEmailPage;
  let fixture: ComponentFixture<VerifySenderEmailPage>;

  let mockSettingsSvc: any;
  let mockRoute: any;

  beforeEach(async () => {
    mockSettingsSvc = {
      verifySenderEmail: vi.fn(),
    };

    mockRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue('mock-jwt-token'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [VerifySenderEmailPage],
      providers: [
        provideRouter([]),
        { provide: SettingsService, useValue: mockSettingsSvc },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifySenderEmailPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error state if token is missing from URL', async () => {
    mockRoute.snapshot.queryParamMap.get.mockReturnValue(null);
    await component.ngOnInit();

    expect(component['status']()).toBe('error');
    expect(component['errorMessage']()).toBe('Invalid or missing verification token.');
    expect(mockSettingsSvc.verifySenderEmail).not.toHaveBeenCalled();
  });

  it('should call verifySenderEmail and show success when token is valid', async () => {
    mockSettingsSvc.verifySenderEmail.mockResolvedValue({
      success: true,
      email: 'test@example.com',
    });

    await component.ngOnInit();

    expect(mockSettingsSvc.verifySenderEmail).toHaveBeenCalledWith('mock-jwt-token');
    expect(component['status']()).toBe('success');
    expect(component['verifiedEmail']()).toBe('test@example.com');
  });

  it('should show error when verification returns false', async () => {
    mockSettingsSvc.verifySenderEmail.mockResolvedValue({
      success: false,
    });

    await component.ngOnInit();

    expect(component['status']()).toBe('error');
    expect(component['errorMessage']()).toBe('Verification failed. The token may be invalid.');
  });

  it('should handle TRPCClientError correctly', async () => {
    const trpcError = new TRPCClientError('Link expired');
    mockSettingsSvc.verifySenderEmail.mockRejectedValue(trpcError);

    await component.ngOnInit();

    expect(component['status']()).toBe('error');
    expect(component['errorMessage']()).toBe('Link expired');
  });

  it('should handle generic error correctly', async () => {
    const error = new Error('Unexpected error');
    mockSettingsSvc.verifySenderEmail.mockRejectedValue(error);

    await component.ngOnInit();

    expect(component['status']()).toBe('error');
    expect(component['errorMessage']()).toBe('Unexpected error');
  });
});
