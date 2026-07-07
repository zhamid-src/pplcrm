import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ShiftViewComponent } from './shift-view';
import { ShiftsService } from '../services/shifts-service';
import { VolunteerService } from '../../../services/api/volunteer-service';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { AuthService } from '../../../auth/auth-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

const mockShiftData = {
  id: '1',
  name: 'Weekend Canvass',
  slug: 'weekend-canvass',
  location_address: 'Central Park',
  start_time: '2026-08-01T09:00:00Z',
  end_time: '2026-08-01T12:00:00Z',
  capacity: 5,
};

let component: ShiftViewComponent;
let fixture: ComponentFixture<ShiftViewComponent>;
let mockShiftsSvc: any;
let mockVolunteerSvc: any;
let mockAlertSvc: any;
let mockActivatedRoute: any;
let mockActivitySvc: any;
let mockDialogSvc: any;
let mockRouter: any;

describe('ShiftViewComponent', () => {
  beforeEach(async () => {
    mockShiftsSvc = {
      getById: vi.fn().mockResolvedValue(mockShiftData),
      delete: vi.fn().mockResolvedValue(true),
      triggerRefresh: vi.fn(),
    };

    mockVolunteerSvc = {
      getShiftsForEvent: vi
        .fn()
        .mockResolvedValue([{ id: 's1', person_id: 'p1', first_name: 'Jane', status: 'signed_up' }]),
    };

    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };

    mockActivatedRoute = {
      snapshot: {
        pathFromRoot: [],
        paramMap: { get: vi.fn((key: string) => (key === 'id' ? '1' : null)) },
      },
    };

    mockActivitySvc = { getActivities: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }) };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };
    mockRouter = { navigate: vi.fn(), url: '/events/shifts/1' };

    await TestBed.configureTestingModule({
      imports: [ShiftViewComponent],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: mockRouter },
        { provide: ShiftsService, useValue: mockShiftsSvc },
        { provide: VolunteerService, useValue: mockVolunteerSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ActivityService, useValue: mockActivitySvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
        { provide: AuthService, useValue: { getUser: vi.fn().mockReturnValue({ tenant_slug: 'testorg' }) } },
      ],
    })
      .overrideComponent(ShiftViewComponent, {
        set: { providers: [{ provide: VolunteerService, useValue: mockVolunteerSvc }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ShiftViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
  });

  it('should load event details and the volunteer roster', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockShiftsSvc.getById).toHaveBeenCalledWith('1');
    expect(mockVolunteerSvc.getShiftsForEvent).toHaveBeenCalledWith('1');
    expect(component['event']()).toEqual(mockShiftData);
    expect(component['roster']()).toHaveLength(1);
  });

  it('should compute remaining capacity from the roster size', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockShiftData, capacity: 5 });
    component['roster'].set([{ id: 's1' }, { id: 's2' }]);

    expect(component['remainingCapacity']()).toBe(3);
  });

  it('should report unlimited capacity when the event has no capacity set', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockShiftData, capacity: null });
    expect(component['remainingCapacity']()).toBe('Unlimited');
  });

  it('should build the public signup url on the tenant subdomain from the event slug', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['publicUrl']()).toBe('https://testorg.localhost/v/weekend-canvass');
  });

  it('should return an empty public url when the event has no slug', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockShiftData, slug: null });
    expect(component['publicUrl']()).toBe('');
  });

  it('should detect whether the event has passed', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockShiftData, end_time: '2000-01-01T00:00:00Z' });
    expect(component['eventPassed']()).toBe(true);

    component['event'].set({ ...mockShiftData, end_time: '2999-01-01T00:00:00Z' });
    expect(component['eventPassed']()).toBe(false);
  });

  it('should map statuses to badge variants', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['getStatusType']('attended')).toBe('success');
    expect(component['getStatusType']('signed_up')).toBe('warning');
    expect(component['getStatusType']('no_show')).toBe('error');
    expect(component['getStatusType']('cancelled')).toBe('neutral');
    expect(component['getStatusType'](null)).toBe('ghost');
  });

  it('should copy the public signup link to the clipboard', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const clipboardMock = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { value: clipboardMock, writable: true });

    component['copySnippet']();
    await new Promise((r) => setTimeout(r, 0));

    expect(clipboardMock.writeText).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Public signup link copied to clipboard!');
  });

  it('should navigate to the edit route relative to the current route', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['editEvent']();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['edit'], { relativeTo: mockActivatedRoute });
  });

  describe('deleteEvent', () => {
    it('should do nothing when the confirmation dialog is cancelled', async () => {
      mockDialogSvc.confirm.mockResolvedValue(false);

      await component['deleteEvent']();

      expect(mockShiftsSvc.delete).not.toHaveBeenCalled();
    });

    it('should delete, refresh and navigate back to the shifts list on confirm', async () => {
      mockDialogSvc.confirm.mockResolvedValue(true);

      await component['deleteEvent']();

      expect(mockShiftsSvc.delete).toHaveBeenCalledWith('1');
      expect(mockShiftsSvc.triggerRefresh).toHaveBeenCalled();
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Event deleted');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/events/shifts']);
    });

    it('should show an error alert when deletion fails', async () => {
      mockDialogSvc.confirm.mockResolvedValue(true);
      mockShiftsSvc.delete.mockRejectedValue(new Error('Server exploded'));

      await component['deleteEvent']();

      expect(mockAlertSvc.showError).toHaveBeenCalledWith('Server exploded');
    });
  });
});
