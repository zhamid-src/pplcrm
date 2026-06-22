import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Icon } from '@icons/icon';
import { AuthLayoutComponent } from '../auth-layout';
import { TRPCService } from '../../services/api/trpc-service';
import { AuthService } from '../auth-service';

@Component({
  selector: 'pc-resume-account-page',
  imports: [AuthLayoutComponent, Icon, DatePipe],
  templateUrl: './resume-account-page.html',
})
export class ResumeAccountPage extends TRPCService<any> {
  protected readonly auth = inject(AuthService);

  protected readonly actionPending = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly loggedInUser = this.auth.getUserSignal();

  protected get canResume(): boolean {
    const role = this.loggedInUser()?.role;
    return role === 'admin' || role === 'owner';
  }

  protected get pausedDate(): Date | null {
    const d = this.loggedInUser()?.tenant_paused_at;
    return d ? new Date(d) : null;
  }

  protected async resumeAccount() {
    this.actionPending.set(true);
    this.errorMessage.set('');
    try {
      await this.api.auth.resumeTenant.mutate();
      await this.auth.getCurrentUser();
      this.router.navigate(['/']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to reactivate account. Please try again.');
    } finally {
      this.actionPending.set(false);
    }
  }
}
