import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { SettingsService } from './services/settings-service';
import { SettingsPage } from './settings-page';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { AuthService } from '../../auth/auth-service';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let mockSettingsSvc: any;
  let mockAlertSvc: any;
  let mockAuthSvc: any;
  let snapshotSignalValue: any;

  beforeEach(async () => {
    snapshotSignalValue = signal<Record<string, unknown>>({
      'organization.name': 'Acme Corp',
      'organization.contact_email': 'hello@acme.com',
      'organization.phone': '(555) 019-2834',
      'organization.address': '456 Oak Ave, Metropolis',
      'campaign.reporting_period': 'monthly',
      'campaign.primary_goal': 'Knock doors',
      'notifications.email_enabled': true,
      'notifications.task_escalation_hours': 24,
      'integrations.webhook_url': 'https://acme.com/webhook',
    });

    mockSettingsSvc = {
      snapshotSignal: snapshotSignalValue,
      load: vi.fn().mockResolvedValue(snapshotSignalValue()),
      getValue: vi.fn((key: string, fallback: any) => {
        const val = snapshotSignalValue()[key];
        return val === undefined ? fallback : val;
      }),
      upsert: vi.fn().mockImplementation(async (entries) => {
        const newSnapshot = { ...snapshotSignalValue() };
        for (const entry of entries) {
          newSnapshot[entry.key] = entry.value;
        }
        snapshotSignalValue.set(newSnapshot);
        return newSnapshot;
      }),
      snapshot: vi.fn(() => snapshotSignalValue()),
      pending: vi.fn(() => false),
    };

    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      show: vi.fn()
    };

    const mockAuthUser = {
      id: '123',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      notification_preferences: {
        mention_in_comment: true,
        task_assigned: true,
        task_due: true,
        person_assigned: true,
        export_ready: true,
        import_summary: true,
      },
    };

    mockAuthSvc = {
      getCurrentUser: vi.fn().mockResolvedValue(mockAuthUser),
      getProfileById: vi.fn().mockResolvedValue(mockAuthUser),
      updateUserProfile: vi.fn().mockResolvedValue(mockAuthUser),
    };

    const mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: SettingsService, useValue: mockSettingsSvc },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: AuthService, useValue: mockAuthSvc }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and build section states', () => {
    expect(component).toBeTruthy();
    expect(component['hasLoaded']()).toBe(true);
    expect(component['sectionStates'].length).toBeGreaterThan(0);

    // Verify first section form is populated
    const orgSection = component['sectionStates'].find(s => s.config.id === 'organization');
    expect(orgSection).toBeTruthy();
    expect(orgSection?.payload()['organization_name']).toBe('Acme Corp');
    expect(orgSection?.payload()['organization_contact_email']).toBe('hello@acme.com');
  });

  it('should allow switching between sections', () => {
    expect(component['selectedSectionId']()).toBe('organization');
    
    component['selectSection']('notifications');
    expect(component['selectedSectionId']()).toBe('notifications');
    expect(component['isSelected']('notifications')).toBe(true);
    expect(component['isSelected']('organization')).toBe(false);
  });

  it('should mark form as dirty when field value changes', () => {
    const orgSection = component['sectionStates'].find(s => s.config.id === 'organization');
    expect(orgSection).toBeTruthy();
    expect(component['isSectionDirty'](orgSection!)).toBe(false);

    // Change a value via DOM element
    const input = fixture.nativeElement.querySelector('#organization_name');
    expect(input).toBeTruthy();
    input.value = 'New Acme Name';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component['isSectionDirty'](orgSection!)).toBe(true);
  });

  it('should validate email field and set invalid state', () => {
    const orgSection = component['sectionStates'].find(s => s.config.id === 'organization');
    expect(orgSection).toBeTruthy();
    expect(component['isSectionInvalid'](orgSection!)).toBe(false);

    // Set invalid email via DOM
    const emailInput = fixture.nativeElement.querySelector('#organization_contact_email');
    expect(emailInput).toBeTruthy();
    emailInput.value = 'invalid-email';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component['isSectionInvalid'](orgSection!)).toBe(true);
  });

  it('should reset section fields back to original settings', () => {
    const orgSection = component['sectionStates'].find(s => s.config.id === 'organization');
    expect(orgSection).toBeTruthy();

    const input = fixture.nativeElement.querySelector('#organization_name');
    input.value = 'Temporary Name';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component['isSectionDirty'](orgSection!)).toBe(true);

    component['resetSection'](orgSection!);
    fixture.detectChanges();

    expect(orgSection?.payload()['organization_name']).toBe('Acme Corp');
    expect(component['isSectionDirty'](orgSection!)).toBe(false);
  });

  it('should save modified fields via SettingsService.upsert', async () => {
    const orgSection = component['sectionStates'].find(s => s.config.id === 'organization');
    expect(orgSection).toBeTruthy();

    const nameInput = fixture.nativeElement.querySelector('#organization_name');
    nameInput.value = 'Acme Corp V2';
    nameInput.dispatchEvent(new Event('input'));

    const phoneInput = fixture.nativeElement.querySelector('#organization_phone');
    phoneInput.value = '(555) 123-4567';
    phoneInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    expect(component['isSectionDirty'](orgSection!)).toBe(true);

    await component['saveSection'](orgSection!);

    expect(mockSettingsSvc.upsert).toHaveBeenCalledWith([
      { key: 'organization.name', value: 'Acme Corp V2' },
      { key: 'organization.phone', value: '(555) 123-4567' }
    ]);
    expect(component['isSectionDirty'](orgSection!)).toBe(false);
    expect(snapshotSignalValue()['organization.name']).toBe('Acme Corp V2');
  });
});
