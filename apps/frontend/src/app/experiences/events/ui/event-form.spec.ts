import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { EventFormComponent } from './event-form';
import { EventsFrontendService } from '../services/events-frontend-service';
import { EventsService } from '../../../services/api/events-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

const validPayload = {
  name: 'Town Hall',
  slug: 'town-hall',
  description: '',
  location_address: '',
  start_time: '2026-08-01T18:00',
  end_time: '2026-08-01T20:00',
  capacity: null as number | null,
  contact_email: '',
  contact_phone: '',
  is_published: false,
  send_reminder: true,
  send_registration_confirmation: true,
};

describe('EventFormComponent', () => {
  let component: EventFormComponent;
  let fixture: ComponentFixture<EventFormComponent>;
  let mockEventsFrontendSvc: any;
  let mockEventsSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockConfirmDialogSvc: any;

  beforeEach(() => {
    mockEventsFrontendSvc = {
      getById: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      triggerRefresh: vi.fn(),
      checkSlugUnique: vi.fn().mockResolvedValue({ unique: true }),
    };

    mockEventsSvc = {
      getTicketTypes: vi.fn().mockResolvedValue([]),
      addTicketType: vi.fn(),
      deleteTicketType: vi.fn(),
    };

    mockAlertSvc = { showError: vi.fn(), showSuccess: vi.fn() };
    mockRouter = { navigate: vi.fn() };
    mockConfirmDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };
  });

  async function createComponent(id?: string) {
    await TestBed.configureTestingModule({
      imports: [EventFormComponent],
      providers: [
        { provide: EventsFrontendService, useValue: mockEventsFrontendSvc },
        { provide: EventsService, useValue: mockEventsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogSvc },
      ],
    })
      .overrideComponent(EventFormComponent, {
        set: { providers: [{ provide: EventsService, useValue: mockEventsSvc }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EventFormComponent);
    component = fixture.componentInstance;
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  }

  it('should initialize an empty form in new mode without loading an event', async () => {
    await createComponent();
    await fixture.whenStable();

    expect(component['isNew']()).toBe(true);
    expect(mockEventsFrontendSvc.getById).not.toHaveBeenCalled();
    expect(component['payload']().name).toBe('');
  });

  it('should load an existing event and its ticket types in edit mode', async () => {
    const mockEvent = {
      id: 'e-1',
      name: 'Town Hall',
      slug: 'town-hall',
      description: 'A meeting',
      location_address: '123 Main St',
      start_time: '2026-08-01T18:00:00Z',
      end_time: '2026-08-01T20:00:00Z',
      capacity: 50,
      contact_email: 'organizer@example.com',
      contact_phone: '555-0100',
      is_published: true,
    };
    mockEventsFrontendSvc.getById.mockResolvedValue(mockEvent);
    mockEventsSvc.getTicketTypes.mockResolvedValue([{ id: 't1', name: 'General', price_cents: 1500 }]);

    await createComponent('e-1');
    await fixture.whenStable();
    await component['loadTicketTypes']();

    expect(mockEventsFrontendSvc.getById).toHaveBeenCalledWith('e-1');
    expect(component['payload']().name).toBe('Town Hall');
    expect(component['payload']().capacity).toBe(50);
    expect(component['ticketTypes']()).toEqual([{ id: 't1', name: 'General', price_cents: 1500 }]);
  });

  it('should not save when the form is invalid', async () => {
    await createComponent();
    await fixture.whenStable();

    expect(component['form']().invalid()).toBe(true);

    await component['save']();

    expect(mockEventsFrontendSvc.add).not.toHaveBeenCalled();
  });

  it('should block saving and show an error when the end time is before the start time', async () => {
    await createComponent();
    await fixture.whenStable();

    component['payload'].set({ ...validPayload, start_time: '2026-08-01T20:00', end_time: '2026-08-01T18:00' });

    await component['save']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(
      'The event cannot end before it starts, please check the dates and times again.',
    );
    expect(mockEventsFrontendSvc.add).not.toHaveBeenCalled();
  });

  it('should block saving and show an error when the slug is already in use', async () => {
    await createComponent();
    await fixture.whenStable();

    component['payload'].set(validPayload);
    component['slugUnique'].set(false);

    await component['save']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith(
      'This URL slug is already in use. Please choose a different one.',
    );
    expect(mockEventsFrontendSvc.add).not.toHaveBeenCalled();
  });

  it('should add a new event and navigate to it on success', async () => {
    mockEventsFrontendSvc.add.mockResolvedValue({ id: 'new-event-id' });

    await createComponent();
    await fixture.whenStable();

    component['payload'].set(validPayload);

    await component['save']();

    expect(mockEventsFrontendSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Town Hall', slug: 'town-hall' }),
    );
    expect(mockEventsFrontendSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Event created successfully');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/events/pages', 'new-event-id']);
  });

  it('should update an existing event and navigate back to it on success', async () => {
    mockEventsFrontendSvc.getById.mockResolvedValue({ id: 'e-1', name: 'Town Hall', slug: 'town-hall' });
    mockEventsFrontendSvc.update.mockResolvedValue(undefined);

    await createComponent('e-1');
    await fixture.whenStable();

    component['payload'].set({ ...validPayload, name: 'Town Hall Updated' });

    await component['save']();

    expect(mockEventsFrontendSvc.update).toHaveBeenCalledWith(
      'e-1',
      expect.objectContaining({ name: 'Town Hall Updated' }),
    );
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Event updated successfully');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/events/pages', 'e-1']);
  });

  describe('ticket types', () => {
    it('should show an error when adding a ticket type without a name', async () => {
      await createComponent('e-1');
      await fixture.whenStable();

      component['newTicket'].set({ name: '   ', description: '', price_cents: 0, capacity: null });
      await component['saveNewTicket']();

      expect(mockAlertSvc.showError).toHaveBeenCalledWith('Ticket type name is required');
      expect(mockEventsSvc.addTicketType).not.toHaveBeenCalled();
    });

    it('should add a ticket type and reload the list', async () => {
      mockEventsFrontendSvc.getById.mockResolvedValue({ id: 'e-1', name: 'Town Hall' });
      mockEventsSvc.addTicketType.mockResolvedValue({ id: 't2' });
      mockEventsSvc.getTicketTypes.mockResolvedValue([{ id: 't2', name: 'VIP' }]);

      await createComponent('e-1');
      await fixture.whenStable();

      component['newTicket'].set({ name: 'VIP', description: '', price_cents: 5000, capacity: 10 });
      await component['saveNewTicket']();

      expect(mockEventsSvc.addTicketType).toHaveBeenCalledWith({
        event_id: 'e-1',
        name: 'VIP',
        description: null,
        price_cents: 5000,
        capacity: 10,
      });
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Ticket type added');
      expect(component['ticketTypes']()).toEqual([{ id: 't2', name: 'VIP' }]);
    });

    it('should delete a ticket type after confirmation', async () => {
      mockEventsFrontendSvc.getById.mockResolvedValue({ id: 'e-1', name: 'Town Hall' });
      mockEventsSvc.deleteTicketType.mockResolvedValue(true);

      await createComponent('e-1');
      await fixture.whenStable();

      await component['deleteTicketType']('t1');

      expect(mockConfirmDialogSvc.confirm).toHaveBeenCalled();
      expect(mockEventsSvc.deleteTicketType).toHaveBeenCalledWith('t1');
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Ticket type deleted');
    });

    it('should not delete a ticket type when the confirmation dialog is cancelled', async () => {
      mockConfirmDialogSvc.confirm.mockResolvedValue(false);

      await createComponent('e-1');
      await fixture.whenStable();

      await component['deleteTicketType']('t1');

      expect(mockEventsSvc.deleteTicketType).not.toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should delete the event and navigate back to the list on confirm', async () => {
      mockEventsFrontendSvc.getById.mockResolvedValue({ id: 'e-1', name: 'Town Hall' });
      mockEventsFrontendSvc.delete.mockResolvedValue(true);

      await createComponent('e-1');
      await fixture.whenStable();

      await component['deleteEvent']();

      expect(mockEventsFrontendSvc.delete).toHaveBeenCalledWith('e-1');
      expect(mockEventsFrontendSvc.triggerRefresh).toHaveBeenCalled();
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Event deleted');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/forms']);
    });
  });

  describe('canDeactivate', () => {
    it('should allow navigation without prompting when nothing has changed', async () => {
      mockEventsFrontendSvc.getById.mockResolvedValue({ id: 'e-1', name: 'Town Hall' });

      await createComponent('e-1');
      await fixture.whenStable();

      const result = await component['canDeactivate']();

      expect(result).toBe(true);
      expect(mockConfirmDialogSvc.confirm).not.toHaveBeenCalled();
    });
  });

  describe('utility helpers', () => {
    it('should slugify event names', async () => {
      await createComponent();
      await fixture.whenStable();

      expect(component['slugify']('Weekend Door Knocking!')).toBe('weekend-door-knocking');
    });

    it('should format prices in cents as dollar amounts', async () => {
      await createComponent();
      await fixture.whenStable();

      expect(component['formatPrice'](0)).toBe('Free');
      expect(component['formatPrice'](1500)).toBe('$15.00');
    });
  });
});
