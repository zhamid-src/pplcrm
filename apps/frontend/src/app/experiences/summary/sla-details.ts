import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-sla-details',
  standalone: true,
  imports: [Icon, RouterLink],
  templateUrl: './sla-details.html',
})
export class SlaDetails {
  public readonly breachedEmails = input.required<any[]>();
  public readonly breachedTasks = input.required<any[]>();
  public readonly emailSlaHours = input<number>(24);
  public readonly taskSlaHours = input<number>(24);

  protected readonly activeTab = signal<'emails' | 'tasks'>('emails');
}
