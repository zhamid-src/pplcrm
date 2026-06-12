import { Component, OnInit, computed, inject, signal, effect, untracked } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { DatePipe } from '@angular/common';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AddVolunteerEventType, UpdateVolunteerEventType, AddVolunteerEventObj } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

import { PersonsService } from '../../persons/services/persons-service';
import { VolunteerEventsFrontendService } from '../services/volunteer-events-frontend-service';
import { VolunteerService } from '../../../services/api/volunteer-service';

@Component({
  selector: 'pc-event-detail',
  imports: [DatePipe, FormsModule, FormField, RouterModule, Icon],
  templateUrl: './event-detail.html',
  providers: [VolunteerService],
})
export class EventDetailComponent implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly personsSvc = inject(PersonsService);
  private readonly volunteerEventsSvc = inject(VolunteerEventsFrontendService);
  private readonly volunteerSvc = inject(VolunteerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected id: string | null = null;
  protected slugManuallyEdited = false;
  protected readonly slugChecking = signal(false);
  protected readonly slugUnique = signal<boolean | null>(null);
  private slugTimeoutId: any = null;

  constructor() {
    const nameSignal = computed(() => this.payload().name);
    effect(
      () => {
        const name = nameSignal();
        if (this.isNew() && !this.slugManuallyEdited) {
          const suggested = this.slugify(name);
          if (untracked(this.payload).slug !== suggested) {
            this.payload.update((p) => ({
              ...p,
              slug: suggested,
            }));
          }
        }
      },
      { allowSignalWrites: true },
    );

    const slugSignal = computed(() => this.payload().slug);
    effect(
      () => {
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
              const res = await this.volunteerEventsSvc.checkSlugUnique(slug, this.isNew() ? null : this.id);
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
      },
      { allowSignalWrites: true },
    );
  }

  protected slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  protected onSlugInput() {
    this.slugManuallyEdited = true;
  }

  protected readonly detail = signal<any>(null);
  protected readonly error = signal<string | null>(null);
  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly saving = signal(false);
  protected readonly isNew = signal(false);
  protected readonly eventPassed = computed(() => {
    const end = this.payload().end_time;
    if (!end) return false;
    return new Date(end) < new Date();
  });

  // Roster state
  protected readonly roster = signal<any[]>([]);
  protected readonly allVolunteers = signal<any[]>([]);
  protected readonly volunteerSearch = signal('');

  protected readonly environment = environment;

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
    is_private: false,
    send_reminder: true,
    send_signup_confirmation: true,
    send_volunteer_alert: true,
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddVolunteerEventObj);
  });

  // Filter out volunteers that are already signed up
  protected readonly volunteerSearchResults = computed(() => {
    const search = this.volunteerSearch().toLowerCase().trim();
    if (!search) return [];

    const rosterIds = new Set(this.roster().map((r) => String(r.person_id)));
    return this.allVolunteers().filter((v) => {
      if (rosterIds.has(String(v.id))) return false;
      const fullName = `${v.first_name || ''} ${v.last_name || ''}`.toLowerCase();
      const email = (v.email || '').toLowerCase();
      return fullName.includes(search) || email.includes(search);
    });
  });

  public ngOnInit(): void {
    const end = this._loading.begin();
    try {
      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam === 'add' || !idParam) {
        this.isNew.set(true);
      } else {
        this.id = idParam;
        this.isNew.set(false);
      }

      void Promise.all([this.loadVolunteers(), this.loadEvent()]).finally(() => end());
    } catch {
      end();
    }
  }

  protected toDatetimeLocalString(val: any): string {
    if (!val) return '';
    const date = new Date(val);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  protected async loadVolunteers() {
    try {
      const res = await this.personsSvc.getAll({ limit: 1000, tags: ['volunteer'] });
      this.allVolunteers.set(res?.rows || []);
    } catch (err) {
      console.error('Failed to load volunteers', err);
    }
  }

  protected async loadEvent() {
    if (this.isNew()) {
      const state = window.history.state;
      if (state && state.cloneData) {
        const event = state.cloneData;
        this.payload.set({
          name: event.name ? `${event.name} (Copy)` : '',
          slug: event.slug ? `${event.slug}-copy` : '',
          description: event.description ?? '',
          location_address: event.location_address ?? '',
          start_time: this.toDatetimeLocalString(event.start_time),
          end_time: this.toDatetimeLocalString(event.end_time),
          capacity: event.capacity ?? null,
          contact_email: event.contact_email ?? '',
          contact_phone: event.contact_phone ?? '',
          is_private: !!event.is_private,
          send_reminder: event.send_reminder !== false,
          send_signup_confirmation: event.send_signup_confirmation !== false,
          send_volunteer_alert: event.send_volunteer_alert !== false,
        });
      }
      return;
    }

    try {
      const event = await this.volunteerEventsSvc.getById(this.id!);
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
        is_private: !!event.is_private,
        send_reminder: event.send_reminder !== false,
        send_signup_confirmation: event.send_signup_confirmation !== false,
        send_volunteer_alert: event.send_volunteer_alert !== false,
      });

      await this.loadRoster();
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load event');
      this.alerts.showError(this.error()!);
    }
  }

  protected async loadRoster() {
    if (!this.id) return;
    try {
      const roster = await this.volunteerSvc.getShiftsForEvent(this.id);
      this.roster.set(roster || []);
    } catch (err) {
      console.error('Failed to load event roster', err);
    }
  }

  protected async save(event?: Event) {
    if (event) event.preventDefault();
    this.form().markAsTouched();
    if (this.form().invalid()) return;

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
      is_private: !!raw.is_private,
      send_reminder: !!raw.send_reminder,
      send_signup_confirmation: !!raw.send_signup_confirmation,
      send_volunteer_alert: !!raw.send_volunteer_alert,
    };

    try {
      if (this.isNew()) {
        const res = await this.volunteerEventsSvc.add(data as AddVolunteerEventType);
        this.volunteerEventsSvc.triggerRefresh();
        this.alerts.showSuccess('Event created successfully');
        await this.router.navigate(['/schedule', res.id]);
      } else {
        await this.volunteerEventsSvc.update(this.id!, data as UpdateVolunteerEventType);
        this.volunteerEventsSvc.triggerRefresh();
        this.alerts.showSuccess('Event updated successfully');
        await this.router.navigate(['/schedule', this.id]);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to save event');
      this.alerts.showError(this.error()!);
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteEvent() {
    if (!this.id) return;
    if (!confirm('Are you sure you want to delete this event? This will also delete all signed up shifts.')) return;

    this.saving.set(true);
    try {
      await this.volunteerEventsSvc.delete(this.id);
      this.volunteerEventsSvc.triggerRefresh();
      this.alerts.showSuccess('Event deleted');
      await this.router.navigate(['/schedule']);
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to delete event');
    } finally {
      this.saving.set(false);
    }
  }

  // Roster Management
  protected async addVolunteer(person: any) {
    try {
      await this.volunteerSvc.signupVolunteer({
        event_id: this.id!,
        person_id: String(person.id),
        status: 'signed_up',
      });
      this.volunteerSearch.set('');
      this.alerts.showSuccess(`${person.first_name} added to roster`);
      await this.loadRoster();
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to add volunteer');
    }
  }

  protected async updateShiftStatus(shift: any, status: any) {
    try {
      await this.volunteerSvc.updateShift(shift.id, {
        status,
        hours_worked: shift.hours_worked ? Number(shift.hours_worked) : null,
        notes: shift.notes || null,
      });
      this.alerts.showSuccess('Shift status updated');
      await this.loadRoster();
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to update shift');
    }
  }

  protected updateShiftHours(shift: any, hours: any) {
    shift.hours_worked = hours ? Number(hours) : null;
  }

  protected updateShiftNotes(shift: any, notes: any) {
    shift.notes = notes || null;
  }

  protected async saveShiftDetails(shift: any) {
    try {
      await this.volunteerSvc.updateShift(shift.id, {
        status: shift.status,
        hours_worked: shift.hours_worked ? Number(shift.hours_worked) : null,
        notes: shift.notes || null,
      });
      this.alerts.showSuccess('Shift details saved');
      await this.loadRoster();
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to save shift details');
    }
  }

  protected async removeVolunteer(shift: any) {
    if (!confirm('Remove this person from the event roster?')) return;
    try {
      await this.volunteerSvc.deleteShift(shift.id);
      this.alerts.showSuccess('Volunteer removed');
      await this.loadRoster();
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to remove volunteer');
    }
  }

  protected copyToClipboard(url: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => this.alerts.showSuccess('Link copied to clipboard'))
      .catch((err) => console.error('Failed to copy', err));
  }
}
