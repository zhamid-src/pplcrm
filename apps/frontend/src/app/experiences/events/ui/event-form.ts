import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, form, validateStandardSchema } from '@angular/forms/signals';
import { Router, RouterModule } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Card as PcCard } from '@uxcommon/components/card/card';
import { DetailHeader as PcDetailHeader } from '@uxcommon/components/detail-header/detail-header';
import { EntityOverview as PcEntityOverview } from '@uxcommon/components/entity-overview/entity-overview';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { Textarea as PcTextarea } from '@uxcommon/components/textarea/textarea';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { FieldsSelector } from '@uxcommon/components/fields-selector/fields-selector';
import { PublicLinkPanel } from '@uxcommon/components/public-link-panel/public-link-panel';
import { environment } from '../../../../environments/environment';

import { AddEventObj, AddEventType, UpdateEventType } from '../../../../../../../libs/common/src';
import { EventsService } from '../../../services/api/events-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { EventsFrontendService } from '../services/events-frontend-service';

@Component({
  selector: 'pc-event-form',
  imports: [
    FormsModule,
    FormField,
    PcInput,
    PcTextarea,
    RouterModule,
    Icon,
    PcDetailHeader,
    PcEntityOverview,
    PcCard,
    FieldsSelector,
    PublicLinkPanel,
  ],
  templateUrl: './event-form.html',
  providers: [EventsService],
})
export class EventFormComponent {
  private readonly _loading = createLoadingGate();
  private readonly alerts = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly eventsFrontendSvc = inject(EventsFrontendService);
  private readonly eventsSvc = inject(EventsService);
  private readonly router = inject(Router);

  private slugTimeoutId: any = null;

  protected readonly addingTicket = signal(false);
  protected readonly selectedFields = signal<string[]>(['first_name', 'last_name', 'email', 'mobile', 'notes']);
  protected readonly publicUrl = computed(() => {
    const slug = this.payload().slug;
    if (!slug || this.isNew()) return '';
    return `${environment.apiUrl}/api/event-pages/view/${slug}`;
  });
  protected readonly detail = signal<any>(null);
  protected readonly payload = signal({
    name: '',
    slug: '',
    description: '',
    location_address: '',
    start_time: '',
    end_time: '',
    capacity: null as number | null,
    contact_email: '',
    contact_phone: '',
    is_published: false,
    send_reminder: true,
    send_registration_confirmation: true,
  });
  protected readonly endBeforeStartError = computed(() => {
    const { start_time, end_time } = this.payload();
    if (!start_time || !end_time) return false;
    return new Date(end_time) <= new Date(start_time);
  });
  protected readonly error = signal<string | null>(null);
  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddEventObj);
  });
  protected readonly isNew = computed(() => !this.id());
  protected readonly loading = this._loading.visible;
  protected readonly newTicket = signal({ name: '', description: '', price_cents: 0, capacity: null as number | null });
  protected readonly saving = signal(false);
  protected readonly slugChecking = signal(false);
  protected readonly slugUnique = signal<boolean | null>(null);

  // Ticket types
  protected readonly ticketTypes = signal<any[]>([]);

  protected slugManuallyEdited = false;

  protected setNewTicketName(v: string) {
    this.newTicket.update((t) => ({ ...t, name: v }));
  }
  protected setNewTicketPrice(v: string) {
    this.newTicket.update((t) => ({ ...t, price_cents: +v }));
  }
  protected setNewTicketCapacity(v: string) {
    this.newTicket.update((t) => ({ ...t, capacity: v ? +v : null }));
  }

  public readonly id = input<string>();

  constructor() {
    const nameSignal = computed(() => this.payload().name);
    effect(() => {
      const name = nameSignal();
      if (this.isNew() && !this.slugManuallyEdited) {
        const suggested = this.slugify(name);
        if (untracked(this.payload).slug !== suggested) {
          this.payload.update((p) => ({ ...p, slug: suggested }));
        }
      }
    });

    const slugSignal = computed(() => this.payload().slug);
    effect(() => {
      const slug = slugSignal();
      if (this.slugTimeoutId) {
        clearTimeout(this.slugTimeoutId);
        this.slugTimeoutId = null;
      }
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        this.slugUnique.set(null);
        this.slugChecking.set(false);
        return;
      }
      this.slugChecking.set(true);
      this.slugTimeoutId = setTimeout(() => {
        void (async () => {
          try {
            const res = await this.eventsFrontendSvc.checkSlugUnique(slug, this.isNew() ? null : (this.id() ?? null));
            if (untracked(slugSignal) === slug) {
              this.slugUnique.set(res.unique);
            }
          } catch (err) {
            console.error('Failed to check slug uniqueness', err);
          } finally {
            if (untracked(slugSignal) === slug) {
              this.slugChecking.set(false);
            }
          }
        })();
      }, 300);
    });
  }

  public ngOnInit(): void {
    const end = this._loading.begin();
    void this.loadEvent().finally(() => end());
  }

  protected cancelAddTicket() {
    this.addingTicket.set(false);
  }

  protected async deleteEvent() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Event Page',
      message: 'Are you sure you want to delete this event page? All registrations will also be deleted.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    this.saving.set(true);
    try {
      await this.eventsFrontendSvc.delete(this.id()!);
      this.eventsFrontendSvc.triggerRefresh();
      this.alerts.showSuccess('Event deleted');
      await this.router.navigate(['/events/pages']);
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to delete event');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteTicketType(id: string) {
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Ticket Type',
      message: 'Delete this ticket type?',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      await this.eventsSvc.deleteTicketType(id);
      this.alerts.showSuccess('Ticket type deleted');
      await this.loadTicketTypes();
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to delete ticket type');
    }
  }

  protected formatPrice(cents: number): string {
    if (!cents) return 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  }

  protected async loadEvent() {
    if (this.isNew()) return;

    try {
      const event = (await this.eventsFrontendSvc.getById(this.id()!)) as any;
      this.detail.set(event);
      this.payload.set({
        name: event.name ?? '',
        slug: event.slug ?? '',
        description: event.description ?? '',
        location_address: event.location_address ?? '',
        start_time: this.toDatetimeLocalString(event.start_time),
        end_time: this.toDatetimeLocalString(event.end_time),
        capacity: event.capacity ?? null,
        contact_email: event.contact_email ?? '',
        contact_phone: event.contact_phone ?? '',
        is_published: !!event.is_published,
        send_reminder: event.send_reminder !== false,
        send_registration_confirmation: event.send_registration_confirmation !== false,
      });
      if (Array.isArray(event.fields) && event.fields.length > 0) {
        this.selectedFields.set(event.fields);
      }
      await this.loadTicketTypes();
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load event');
      this.alerts.showError(this.error()!);
    }
  }

  protected async loadTicketTypes() {
    if (!this.id()) return;
    try {
      const types = await this.eventsSvc.getTicketTypes(this.id()!);
      this.ticketTypes.set(types || []);
    } catch (err) {
      console.error('Failed to load ticket types', err);
    }
  }

  protected onSlugInput() {
    this.slugManuallyEdited = true;
  }

  protected async save(done?: (() => void) | Event) {
    if (done instanceof Event) done.preventDefault();
    this.form().markAsTouched();
    if (this.form().invalid()) return;

    if (this.endBeforeStartError()) {
      this.alerts.showError('The event cannot end before it starts, please check the dates and times again.');
      return;
    }

    if (this.slugUnique() === false) {
      this.alerts.showError('This URL slug is already in use. Please choose a different one.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.payload();
    const data = {
      name: raw.name.trim(),
      slug: raw.slug.trim(),
      description: raw.description?.trim() || null,
      location_address: raw.location_address?.trim() || null,
      start_time: new Date(raw.start_time),
      end_time: new Date(raw.end_time),
      capacity: raw.capacity ? Number(raw.capacity) : null,
      contact_email: raw.contact_email?.trim() || null,
      contact_phone: raw.contact_phone?.trim() || null,
      is_published: !!raw.is_published,
      send_reminder: !!raw.send_reminder,
      send_registration_confirmation: !!raw.send_registration_confirmation,
      fields: this.selectedFields(),
    };

    try {
      if (this.isNew()) {
        const res = await this.eventsFrontendSvc.add(data as AddEventType);
        this.eventsFrontendSvc.triggerRefresh();
        this.alerts.showSuccess('Event created successfully');
        await this.router.navigate(['/events/pages', (res as any).id]);
      } else {
        await this.eventsFrontendSvc.update(this.id()!, data as UpdateEventType);
        this.eventsFrontendSvc.triggerRefresh();
        this.alerts.showSuccess('Event updated successfully');
        if (typeof done === 'function') {
          done();
        } else {
          await this.router.navigate(['/events/pages', this.id()]);
        }
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to save event');
      this.alerts.showError(this.error()!);
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveNewTicket() {
    const t = this.newTicket();
    if (!t.name.trim()) {
      this.alerts.showError('Ticket type name is required');
      return;
    }
    try {
      await this.eventsSvc.addTicketType({
        event_id: this.id()!,
        name: t.name.trim(),
        description: t.description?.trim() || null,
        price_cents: Number(t.price_cents) || 0,
        capacity: t.capacity ? Number(t.capacity) : null,
      });
      this.addingTicket.set(false);
      this.alerts.showSuccess('Ticket type added');
      await this.loadTicketTypes();
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to add ticket type');
    }
  }

  protected slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Ticket type management
  protected startAddTicket() {
    this.newTicket.set({ name: '', description: '', price_cents: 0, capacity: null });
    this.addingTicket.set(true);
  }

  protected toDatetimeLocalString(val: any): string {
    if (!val) return '';
    const date = new Date(val);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
