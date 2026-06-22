import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { ConnectionsService } from '../../../services/api/connections-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { ConnectionCard } from './connection-card';
import { AddConnectionDrawer } from './add-connection-drawer';
import { Icon } from '@uxcommon/components/icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

@Component({
  selector: 'pc-person-connections',
  imports: [ConnectionCard, AddConnectionDrawer, Icon],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h4 class="font-semibold text-base-content/80">
          Connections
          @if (connections().length > 0) {
            <span class="badge badge-sm badge-neutral ml-2">{{ connections().length }}</span>
          }
        </h4>
        <button type="button" class="btn btn-sm btn-primary gap-1.5" (click)="showAddDrawer.set(true)">
          <pc-icon name="plus" [size]="4"></pc-icon>
          Add Connection
        </button>
      </div>

      <!-- Loading skeleton -->
      @if (isLoading()) {
        <div class="flex flex-col gap-2">
          <div class="skeleton h-16 w-full rounded-xl"></div>
          <div class="skeleton h-16 w-full rounded-xl"></div>
        </div>
      } @else if (connections().length === 0) {
        <div class="text-center py-10 text-base-content/40 italic text-sm">
          No connections recorded. Add one to start mapping this contact's network.
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (conn of connections(); track conn.id) {
            <pc-connection-card
              [connection]="conn"
              [currentPersonId]="personId()"
              (remove)="onRemove($event)"
            ></pc-connection-card>
          }
        </div>
      }
    </div>

    <pc-add-connection-drawer
      [personId]="personId()"
      [isOpen]="showAddDrawer()"
      (close)="showAddDrawer.set(false)"
      (saved)="onConnectionAdded()"
    ></pc-add-connection-drawer>
  `,
})
export class PersonConnections implements OnInit {
  readonly personId = input.required<string>();
  readonly countChange = output<number>();

  private readonly connectionsSvc = inject(ConnectionsService);
  private readonly alertSvc = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly connections = signal<any[]>([]);
  protected readonly showAddDrawer = signal(false);

  public ngOnInit() {
    this.load();
  }

  private async load() {
    const end = this._loading.begin();
    try {
      const result = await this.connectionsSvc.getForPerson(this.personId());
      this.connections.set(result as any[]);
      this.countChange.emit(result.length);
    } catch {
      // silently fail — tab stays empty
    } finally {
      end();
    }
  }

  protected onConnectionAdded() {
    this.load();
  }

  protected async onRemove(id: string) {
    const confirmed = await this.dialogs.confirm({
      title: 'Remove Connection',
      message: 'Are you sure you want to remove this connection?',
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await this.connectionsSvc.remove(id);
      this.connections.update((list) => list.filter((c) => c.id !== id));
      this.countChange.emit(this.connections().length);
      this.alertSvc.showSuccess('Connection removed');
    } catch {
      this.alertSvc.showError('Failed to remove connection');
    }
  }
}
