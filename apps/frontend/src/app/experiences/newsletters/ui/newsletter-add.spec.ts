import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { NewsletterAddComponent } from './newsletter-add';
import { NewslettersService } from '../services/newsletters-service';

describe('NewsletterAddComponent', () => {
  let component: NewsletterAddComponent;
  let fixture: ComponentFixture<NewsletterAddComponent>;
  let mockAlertSvc: any;
  let mockListsSvc: any;
  let mockTagsSvc: any;
  let mockNewslettersSvc: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };
    mockListsSvc = {
      getAll: vi.fn().mockResolvedValue({
        rows: [{ id: 'l1', name: 'VIP Donors', list_size: 50 }],
        count: 1,
      }),
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
    };
    mockRouter = { navigate: vi.fn() };
    mockActivatedRoute = { snapshot: { paramMap: { get: () => null } } };

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should load available lists and tags on init', () => {
    expect(mockListsSvc.getAll).toHaveBeenCalledWith({ limit: 100, startRow: 0 });
    expect(mockTagsSvc.getAll).toHaveBeenCalledWith({ limit: 100, startRow: 0 });
    expect(component['availableLists']()).toEqual([{ id: 'l1', name: 'VIP Donors', size: 50 }]);
    expect(component['availableTags']()).toEqual([{ id: 't1', name: 'volunteer', usage: 15 }]);
  });

  it('should switch between options, regular, and automated modes', () => {
    component['selectRegular']();
    expect(component['mode']()).toBe('regular');
    expect(component['currentStep']()).toBe(1);

    component['switchToOptions']();
    expect(component['mode']()).toBe('options');

    component['selectAutomated']();
    expect(component['mode']()).toBe('automated');
  });

  it('should populate the html/plain text content when a template is selected', () => {
    component['selectRegular']();
    component['selectTemplate']('product');

    expect(component['selectedTemplate']()).toBe('product');
    expect(component['regularForm'].get('htmlContent')?.value).toContain('Introducing Visual Newsletters!');
    expect(component['regularForm'].get('plainTextContent')?.value).toContain('Introducing Visual Newsletters!');
  });

  it('should not advance past step 3 when required summary fields are invalid', () => {
    component['selectRegular']();
    component['currentStep'].set(3);

    component['handleNext']();

    expect(component['currentStep']()).toBe(3);
    expect(component['isInvalid']('subject')).toBe(true);
  });

  it('should advance to step 4 once required summary fields are valid', () => {
    component['selectRegular']();
    component['currentStep'].set(3);
    component['regularForm'].patchValue({
      subject: 'Hello',
      fromName: 'Jane',
      fromAddress: 'jane@example.com',
    });

    component['handleNext']();

    expect(component['currentStep']()).toBe(4);
  });

  it('should add and remove included list ids, refreshing the audience estimate', () => {
    component['selectRegular']();
    const select = { value: 'l1' } as unknown as HTMLSelectElement;

    component['handleIncludeListSelect']({ target: select } as unknown as Event);
    expect(component['includeListIds']()).toEqual(['l1']);
    expect(component['estimatedAudienceCount']()).toBe(50);

    component['removeIncludeList']('l1');
    expect(component['includeListIds']()).toEqual([]);
    expect(component['estimatedAudienceCount']()).toBe(0);
  });

  it('should subtract excluded list sizes from the estimated audience', () => {
    component['selectRegular']();
    component['includeListIds'].set(['l1']);
    component['handleExcludeTagsChange'](['volunteer']);

    // include list (50) + include tag usage (0, none included) - exclude tag usage (15)
    expect(component['estimatedAudienceCount']()).toBe(35);
  });

  it('should resolve list names for the audience summary', () => {
    component['selectRegular']();
    expect(component['listName']('l1')).toBe('VIP Donors');
    expect(component['listName']('unknown')).toBe('List');
  });

  it('should block sendRegular when the form is invalid', async () => {
    component['selectRegular']();

    await component['sendRegular']();

    expect(mockNewslettersSvc.add).not.toHaveBeenCalled();
  });

  it('should save and send immediately when timing mode is "now"', async () => {
    component['selectRegular']();
    component['regularForm'].patchValue({
      subject: 'Big News',
      fromName: 'Jane',
      fromAddress: 'jane@example.com',
      timingMode: 'now',
    });

    await component['sendRegular']();

    expect(mockNewslettersSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Big News', status: 'draft' }),
    );
    expect(mockNewslettersSvc.send).toHaveBeenCalledWith('nl-1');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Newsletter sent successfully!');
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('should save without sending when timing mode is scheduled with a valid date/time', async () => {
    component['selectRegular']();
    component['regularForm'].patchValue({
      subject: 'Scheduled News',
      fromName: 'Jane',
      fromAddress: 'jane@example.com',
      timingMode: 'schedule',
      scheduledDate: '2026-12-01',
      scheduledTime: '09:00',
    });

    await component['sendRegular']();

    expect(mockNewslettersSvc.add).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }));
    expect(mockNewslettersSvc.send).not.toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Newsletter scheduled successfully.');
  });

  it('should require a schedule date/time before sending a scheduled newsletter', async () => {
    component['selectRegular']();
    component['regularForm'].patchValue({
      subject: 'Scheduled News',
      fromName: 'Jane',
      fromAddress: 'jane@example.com',
      timingMode: 'schedule',
    });

    await component['sendRegular']();

    expect(mockNewslettersSvc.add).not.toHaveBeenCalled();
  });

  it('should show an error alert when saving the newsletter fails', async () => {
    component['selectRegular']();
    component['regularForm'].patchValue({
      subject: 'Big News',
      fromName: 'Jane',
      fromAddress: 'jane@example.com',
      timingMode: 'now',
    });
    mockNewslettersSvc.add.mockRejectedValue(new Error('Save failed'));

    await component['sendRegular']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Save failed');
  });

  it('should navigate to the parent route on close', () => {
    component['close']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });
});
