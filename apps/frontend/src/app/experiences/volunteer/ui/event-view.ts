import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { VolunteerEventsFrontendService } from '../services/volunteer-events-frontend-service';
import { VolunteerService } from '../../../services/api/volunteer-service';
import { environment } from '../../../../environments/environment';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

@Component({
  selector: 'pc-event-view',
  imports: [DatePipe, RouterModule, Icon, RecordActivities, FormActions],
  templateUrl: './event-view.html',
  providers: [VolunteerService],
})
export class EventViewComponent {
  readonly id = input.required<string>();

  private readonly alertSvc = inject(AlertService);
  private readonly volunteerEventsSvc = inject(VolunteerEventsFrontendService);
  private readonly volunteerSvc = inject(VolunteerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);
  protected readonly isLoading = signal(false);
  protected readonly event = signal<any | null>(null);
  protected readonly roster = signal<any[]>([]);

  // Active tab state
  protected activeTab = signal<'roster' | 'activity'>('roster');

  protected readonly eventPassed = computed(() => {
    const end = this.event()?.end_time;
    if (!end) return false;
    return new Date(end) < new Date();
  });

  protected readonly remainingCapacity = computed(() => {
    const detail = this.event();
    if (!detail || detail.capacity === null || detail.capacity === undefined) {
      return 'Unlimited';
    }
    const count = this.roster().length;
    return Math.max(0, detail.capacity - count);
  });

  protected readonly publicUrl = computed(() => {
    const detail = this.event();
    if (!detail || !detail.public_url) return '';
    return environment.apiUrl + detail.public_url;
  });

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => this.loadAllData(currentId));
    });
  }

  protected async loadAllData(id: string) {
    this.isLoading.set(true);
    try {
      // 1. Load Event details
      const detail = await this.volunteerEventsSvc.getById(id);
      this.event.set(detail);

      // 2. Load associated shifts/roster
      const rosterData = await this.volunteerSvc.getShiftsForEvent(id);
      this.roster.set(rosterData || []);
    } catch (err) {
      this.alertSvc.showError('Failed to load event details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected editEvent() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteEvent() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This will also delete all signed up shifts.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    this.isLoading.set(true);
    try {
      await this.volunteerEventsSvc.delete(this.id());
      this.volunteerEventsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Event deleted');
      await this.router.navigate(['/events']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete event';
      this.alertSvc.showError(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected copySnippet(): void {
    const url = this.publicUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => this.alertSvc.showSuccess('Public signup link copied to clipboard!'),
      () => this.alertSvc.showError('Failed to copy to clipboard.'),
    );
  }

  protected getStatusClass(status: string | null | undefined): string {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'attended':
        return 'badge-success text-success-content';
      case 'signed_up':
        return 'badge-warning text-warning-content';
      case 'no_show':
        return 'badge-error text-error-content';
      case 'cancelled':
        return 'badge-neutral text-neutral-content';
      default:
        return 'badge-ghost';
    }
  }
}
