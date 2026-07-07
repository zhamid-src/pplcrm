import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { EventViewComponent } from './event-view';
import { EventsFrontendService } from '../services/events-frontend-service';
import { EventsService } from '../../../services/api/events-service';
import { PersonsService } from '../../persons/services/persons-service';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { AuthService } from '../../../auth/auth-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

const mockEventData = {
  id: '1',
  name: 'Town Hall',
  slug: 'town-hall',
  description: 'Community town hall meeting',
  location_address: '123 Main St',
  start_time: '2026-08-01T18:00:00Z',
  end_time: '2026-08-01T20:00:00Z',
  capacity: 10,
  is_published: true,
};

let component: EventViewComponent;
let fixture: ComponentFixture<EventViewComponent>;
let mockEventsFrontendSvc: any;
let mockEventsSvc: any;
let mockPersonsSvc: any;
let mockAlertSvc: any;
let mockActivatedRoute: any;
let mockActivitySvc: any;
let mockDialogSvc: any;
let mockRouter: any;

describe('EventViewComponent', () => {
  beforeEach(async () => {
    mockEventsFrontendSvc = {
      getById: vi.fn().mockResolvedValue(mockEventData),
      delete: vi.fn().mockResolvedValue(true),
      triggerRefresh: vi.fn(),
    };

    mockEventsSvc = {
      getTicketTypes: vi.fn().mockResolvedValue([{ id: 't1', name: 'General', price_cents: 2000 }]),
      getRegistrations: vi
        .fn()
        .mockResolvedValue([{ id: 'r1', person_id: 'p1', first_name: 'Jane', last_name: 'Doe', status: 'registered' }]),
      addRegistration: vi.fn(),
      checkIn: vi.fn(),
      updateRegistration: vi.fn(),
      deleteRegistration: vi.fn(),
    };

    mockPersonsSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [], count: 0 }),
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
    mockRouter = { navigate: vi.fn(), url: '/events/pages/1' };

    await TestBed.configureTestingModule({
      imports: [EventViewComponent],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: mockRouter },
        { provide: EventsFrontendService, useValue: mockEventsFrontendSvc },
        { provide: EventsService, useValue: mockEventsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: ActivityService, useValue: mockActivitySvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
        { provide: AuthService, useValue: { getUser: vi.fn().mockReturnValue({ tenant_slug: 'testorg' }) } },
      ],
    })
      .overrideComponent(EventViewComponent, {
        set: { providers: [{ provide: EventsService, useValue: mockEventsSvc }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EventViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
  });

  it('should load event details, ticket types, and registrations', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockEventsFrontendSvc.getById).toHaveBeenCalledWith('1');
    expect(mockEventsSvc.getTicketTypes).toHaveBeenCalledWith('1');
    expect(mockEventsSvc.getRegistrations).toHaveBeenCalledWith('1');

    expect(component['event']()).toEqual(mockEventData);
    expect(component['ticketTypes']()).toEqual([{ id: 't1', name: 'General', price_cents: 2000 }]);
    expect(component['registrations']()).toHaveLength(1);
  });

  it('should compute active and attended registration counts', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['registrations'].set([
      { id: 'r1', status: 'registered' },
      { id: 'r2', status: 'attended' },
      { id: 'r3', status: 'cancelled' },
    ]);

    expect(component['activeCount']()).toBe(2);
    expect(component['attendedCount']()).toBe(1);
  });

  it('should compute remaining capacity based on active registrations', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockEventData, capacity: 5 });
    component['registrations'].set([{ status: 'registered' }, { status: 'registered' }, { status: 'cancelled' }]);

    expect(component['remainingCapacity']()).toBe(3);
  });

  it('should report unlimited capacity when the event has no capacity set', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockEventData, capacity: null });
    expect(component['remainingCapacity']()).toBe('Unlimited');
  });

  it('should build the public RSVP url on the tenant subdomain from the event slug', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['publicUrl']()).toBe('https://testorg.localhost/e/town-hall');
  });

  it('should detect whether the event has already passed', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['event'].set({ ...mockEventData, end_time: '2000-01-01T00:00:00Z' });
    expect(component['eventPassed']()).toBe(true);

    component['event'].set({ ...mockEventData, end_time: '2999-01-01T00:00:00Z' });
    expect(component['eventPassed']()).toBe(false);
  });

  describe('person search for registrations', () => {
    it('should search people and populate results', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      mockPersonsSvc.getAll.mockResolvedValue({ rows: [{ id: 'p2', first_name: 'John', last_name: 'Smith' }] });

      await component['onPersonSearch']('john');

      expect(mockPersonsSvc.getAll).toHaveBeenCalledWith({ searchStr: 'john', startRow: 0, endRow: 10 });
      expect(component['personSearchResults']()).toEqual([{ id: 'p2', first_name: 'John', last_name: 'Smith' }]);
    });

    it('should clear results when the search query is empty', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      component['personSearchResults'].set([{ id: 'p2' }]);
      await component['onPersonSearch']('   ');

      expect(component['personSearchResults']()).toEqual([]);
      expect(mockPersonsSvc.getAll).not.toHaveBeenCalled();
    });

    it('should select a person and populate the search field', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      component['selectPerson']({ id: 'p2', first_name: 'John', last_name: 'Smith' });

      expect(component['selectedPersonId']()).toBe('p2');
      expect(component['personSearch']()).toBe('John Smith');
      expect(component['personSearchResults']()).toEqual([]);
    });
  });

  describe('addRegistration', () => {
    it('should show an error when no person is selected', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      await component['addRegistration']();

      expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please select a person to register.');
      expect(mockEventsSvc.addRegistration).not.toHaveBeenCalled();
    });

    it('should register the selected person and refresh registrations', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      component['selectedPersonId'].set('p2');
      mockEventsSvc.addRegistration.mockResolvedValue({ id: 'r5' });
      mockEventsSvc.getRegistrations.mockResolvedValue([{ id: 'r5', status: 'registered' }]);

      await component['addRegistration']();

      expect(mockEventsSvc.addRegistration).toHaveBeenCalledWith({
        event_id: '1',
        person_id: 'p2',
        ticket_type_id: null,
      });
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Registration added');
      expect(component['registrations']()).toEqual([{ id: 'r5', status: 'registered' }]);
    });
  });

  describe('deleteEvent', () => {
    it('should do nothing when the confirmation dialog is cancelled', async () => {
      mockDialogSvc.confirm.mockResolvedValue(false);

      await component['deleteEvent']();

      expect(mockEventsFrontendSvc.delete).not.toHaveBeenCalled();
    });

    it('should delete, refresh and navigate back to the events list on confirm', async () => {
      mockDialogSvc.confirm.mockResolvedValue(true);

      await component['deleteEvent']();

      expect(mockEventsFrontendSvc.delete).toHaveBeenCalledWith('1');
      expect(mockEventsFrontendSvc.triggerRefresh).toHaveBeenCalled();
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Event deleted');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/events/pages']);
    });
  });

  it('should check in a registrant and refresh the roster', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    mockEventsSvc.getRegistrations.mockResolvedValue([{ id: 'r1', status: 'attended', first_name: 'Jane' }]);

    await component['checkIn']({ id: 'r1', first_name: 'Jane' });

    expect(mockEventsSvc.checkIn).toHaveBeenCalledWith('r1');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Jane checked in');
  });

  it('should remove a registration after confirmation', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    mockDialogSvc.confirm.mockResolvedValue(true);
    mockEventsSvc.getRegistrations.mockResolvedValue([]);

    await component['deleteRegistration']({ id: 'r1', first_name: 'Jane', last_name: 'Doe' });

    expect(mockEventsSvc.deleteRegistration).toHaveBeenCalledWith('r1');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Registration removed');
  });
});
