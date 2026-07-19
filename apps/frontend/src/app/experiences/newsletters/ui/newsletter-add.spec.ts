import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AuthService } from '../../../auth/auth-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { SettingsService } from '../../settings/services/settings-service';
import { NewsletterAddComponent } from './newsletter-add';
import { NewslettersService } from '../services/newsletters-service';

describe('NewsletterAddComponent', () => {
  let component: NewsletterAddComponent;
  let fixture: ComponentFixture<NewsletterAddComponent>;
  let mockAlertSvc: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let mockListsSvc: { getAll: ReturnType<typeof vi.fn> };
  let mockTagsSvc: { getAll: ReturnType<typeof vi.fn> };
  let mockNewslettersSvc: {
    add: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    sendTest: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: unknown;
  let mockAuthSvc: { getUser: ReturnType<typeof vi.fn>; getUserSignal: () => () => unknown };
  let mockConfirmDlg: { confirm: ReturnType<typeof vi.fn> };
  let mockSettingsSvc: { load: ReturnType<typeof vi.fn>; getValue: ReturnType<typeof vi.fn> };

  const validDetails = { subject: 'Big News', fromName: 'Jane', fromAddress: 'jane@example.com' };

  /** Patches the signal-form payload the way a user filling the fields would. */
  function patchPayload(
    patch: Partial<{
      subject: string;
      fromName: string;
      fromAddress: string;
      htmlContent: string;
      plainTextContent: string;
      timingMode: 'now' | 'schedule';
      scheduledDate: string;
      scheduledTime: string;
    }>,
  ): void {
    component['regularPayload'].update((p) => ({ ...p, ...patch }));
  }

  beforeEach(async () => {
    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };
    mockListsSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [{ id: 'l1', name: 'VIP Donors', list_size: 50 }], count: 1 }),
    };
    mockTagsSvc = {
      getAll: vi.fn().mockResolvedValue({
        rows: [{ id: 't1', name: 'volunteer', use_count_people: 10, use_count_households: 5 }],
        count: 1,
      }),
    };
    mockNewslettersSvc = {
      add: vi.fn().mockResolvedValue({ id: 'nl-1' }),
      send: vi.fn().mockResolvedValue({ success: true }),
      sendTest: vi.fn().mockResolvedValue({ to: 'me@example.com', delivered: 1 }),
    };
    mockRouter = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    mockActivatedRoute = { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } } };
    mockAuthSvc = {
      getUser: vi.fn().mockReturnValue({ email: 'me@example.com' }),
      getUserSignal: () => () => ({ email: 'me@example.com', tenant_demo_mode_at: null }),
    };
    mockConfirmDlg = { confirm: vi.fn().mockResolvedValue(true) };
    mockSettingsSvc = {
      load: vi.fn().mockResolvedValue({}),
      getValue: vi.fn((_key: string, fallback: unknown) => fallback),
    };

    await TestBed.configureTestingModule({
      imports: [NewsletterAddComponent],
      providers: [
        provideRouter([]),
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ListsService, useValue: mockListsSvc },
        { provide: TagsService, useValue: mockTagsSvc },
        { provide: NewslettersService, useValue: mockNewslettersSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: ConfirmDialogService, useValue: mockConfirmDlg },
        { provide: SettingsService, useValue: mockSettingsSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads available lists and tags on init', () => {
    expect(mockListsSvc.getAll).toHaveBeenCalledWith({ limit: 100, startRow: 0 });
    expect(mockTagsSvc.getAll).toHaveBeenCalledWith({ limit: 100, startRow: 0 });
    expect(component['availableLists']()).toEqual([{ id: 'l1', name: 'VIP Donors', size: 50 }]);
    expect(component['availableTags']()).toEqual([{ id: 't1', name: 'volunteer', usage: 15 }]);
  });

  it('lands on the template step with the welcome template preselected', () => {
    expect(component['currentStep']()).toBe(1);
    expect(component['currentStepId']()).toBe('template');
    expect(component['selectedTemplate']()).toBe('welcome');
    // The auto-applied default is not a user edit, so the leave guard stays quiet.
    expect(component['dirty']()).toBe(false);
  });

  it('populates the html/plain text content when a template is selected', () => {
    component['selectTemplate']('product');

    expect(component['selectedTemplate']()).toBe('product');
    expect(component['regularPayload']().htmlContent).toContain('Introducing Visual Newsletters!');
    expect(component['regularPayload']().plainTextContent).toContain('Introducing Visual Newsletters!');
  });

  it('exposes sentence-case template names for the review step', () => {
    component['selectTemplate']('welcome');
    expect(component['selectedTemplateName']()).toBe('Welcome email');
  });

  it('does not advance past step 3 when required detail fields are invalid, and coaches', () => {
    component['currentStep'].set(3);

    component['handleNext']();

    expect(component['currentStep']()).toBe(3);
    expect(component['isInvalid']('subject')).toBe(true);
    expect(mockAlertSvc.showError).toHaveBeenCalledWith(component['subjectCoach']);
  });

  it('advances to step 4 once required detail fields are valid', () => {
    component['currentStep'].set(3);
    patchPayload(validDetails);

    component['handleNext']();

    expect(component['currentStep']()).toBe(4);
  });

  it('only lets you jump to completed or current steps, never a locked future step', () => {
    component['currentStep'].set(2);

    component['goToStep'](4); // locked future step
    expect(component['currentStep']()).toBe(2);

    component['goToStep'](1); // completed step
    expect(component['currentStep']()).toBe(1);
  });

  it('adds and removes included lists, refreshing the audience estimate', () => {
    component['addIncludeList']('l1');
    expect(component['includeListIds']()).toEqual(['l1']);
    expect(component['estimatedAudienceCount']()).toBe(50);

    component['removeIncludeList']('l1');
    expect(component['includeListIds']()).toEqual([]);
    expect(component['estimatedAudienceCount']()).toBe(0);
  });

  it('subtracts excluded tag usage from the estimated audience', () => {
    component['addIncludeList']('l1');
    component['addExcludeTag']('volunteer');

    // include list (50) - exclude tag usage (15)
    expect(component['estimatedAudienceCount']()).toBe(35);
  });

  it('does not offer the same list as both an include and exclude suggestion', () => {
    component['addIncludeList']('l1');

    expect(component['includeListSuggestions']().some((l) => l.id === 'l1')).toBe(false);
    // moving it to exclude removes it from includes
    component['addExcludeList']('l1');
    expect(component['includeListIds']()).toEqual([]);
    expect(component['excludeListIds']()).toEqual(['l1']);
  });

  it('resolves list names and sizes for chips', () => {
    expect(component['listName']('l1')).toBe('VIP Donors');
    expect(component['listSize']('l1')).toBe(50);
    expect(component['listName']('unknown')).toBe('List');
  });

  it('formats an honest people label', () => {
    expect(component['peopleLabel'](1)).toBe('1 person');
    expect(component['peopleLabel'](1312)).toBe('1,312 people');
  });

  it('blocks send when required detail fields are missing and returns to step 3', async () => {
    component['currentStep'].set(4);

    await component['sendRegular']();

    expect(mockConfirmDlg.confirm).not.toHaveBeenCalled();
    expect(mockNewslettersSvc.add).not.toHaveBeenCalled();
    expect(component['currentStep']()).toBe(3);
  });

  it('runs a send preflight and, on confirm, saves then sends immediately for "now"', async () => {
    patchPayload({ ...validDetails, timingMode: 'now' });

    await component['sendRegular']();

    expect(mockConfirmDlg.confirm).toHaveBeenCalled();
    expect(mockNewslettersSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Big News', status: 'draft' }),
    );
    expect(mockNewslettersSvc.send).toHaveBeenCalledWith('nl-1');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith(expect.stringContaining('Queued "Big News"'));
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('does not send when the preflight is cancelled', async () => {
    mockConfirmDlg.confirm.mockResolvedValueOnce(false);
    patchPayload({ ...validDetails, timingMode: 'now' });

    await component['sendRegular']();

    expect(mockNewslettersSvc.add).not.toHaveBeenCalled();
    expect(mockNewslettersSvc.send).not.toHaveBeenCalled();
  });

  it('schedules (status scheduled, no immediate send) with a valid date/time', async () => {
    patchPayload({
      ...validDetails,
      timingMode: 'schedule',
      scheduledDate: '2026-12-01',
      scheduledTime: '09:00',
    });

    await component['sendRegular']();

    expect(mockNewslettersSvc.add).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }));
    expect(mockNewslettersSvc.send).not.toHaveBeenCalled();
  });

  it('requires a schedule date/time before sending a scheduled newsletter', async () => {
    patchPayload({ ...validDetails, timingMode: 'schedule' });

    await component['sendRegular']();

    expect(mockConfirmDlg.confirm).not.toHaveBeenCalled();
    expect(mockNewslettersSvc.add).not.toHaveBeenCalled();
    expect(mockAlertSvc.showError).toHaveBeenCalledWith(component['scheduleCoach']);
  });

  it('saves a draft and exits with a toast', async () => {
    patchPayload(validDetails);

    await component['saveDraft']();

    expect(mockNewslettersSvc.add).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Saved draft "Big News". Find it in Newsletters');
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('sends a test email to the current user and confirms the recipient', async () => {
    patchPayload({ subject: 'Big News' });

    await component['sendTestEmail']();

    expect(mockNewslettersSvc.sendTest).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'me@example.com', subject: 'Big News' }),
    );
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Sent a test of "Big News" to me@example.com');
  });

  it('shows an error when the newsletter fails to save', async () => {
    patchPayload({ ...validDetails, timingMode: 'now' });
    mockNewslettersSvc.add.mockRejectedValueOnce(new Error('Save failed'));

    await component['sendRegular']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Save failed');
  });

  it('lets you leave freely when nothing has changed', async () => {
    await expect(component.canDeactivate()).resolves.toBe(true);
    expect(mockConfirmDlg.confirm).not.toHaveBeenCalled();
  });

  it('guards against losing an in-progress draft on leave', async () => {
    component['selectTemplate']('product'); // a real user edit marks the wizard dirty

    await component.canDeactivate();

    expect(mockConfirmDlg.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelText: 'Keep editing', emphasizeCancel: true }),
    );
  });

  it('navigates to the parent route on close', () => {
    component['close']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });
});
