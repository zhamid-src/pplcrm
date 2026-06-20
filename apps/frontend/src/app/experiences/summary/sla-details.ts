import { Component, input, model, output } from '@angular/core';
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

  public readonly totalEmailBreaches = input<number>(0);
  public readonly totalTaskBreaches = input<number>(0);
  public readonly hasMoreEmails = input<boolean>(false);
  public readonly hasMoreTasks = input<boolean>(false);
  public readonly isLoadingEmails = input<boolean>(false);
  public readonly isLoadingTasks = input<boolean>(false);

  public readonly loadMoreEmails = output<void>();
  public readonly loadMoreTasks = output<void>();

  public readonly activeTab = model<'emails' | 'tasks'>('emails');
}
