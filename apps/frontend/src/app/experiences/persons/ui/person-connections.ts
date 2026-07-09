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
      <!-- Header — the section title lives on the host page; this row only offers the add action -->
      <div class="flex items-center justify-end">
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
      } @else if (loaded()) {
        <!-- Only decide empty-vs-list once a fetch has finished, so a sub-300ms
             load (which never trips the skeleton) can't flash the empty state. -->
        @if (connections().length === 0) {
          <div i18n class="text-center py-10 text-base-content/40 italic text-sm">
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
      }
    </div>

    <pc-add-connection-drawer
      [personId]="personId()"
      [isOpen]="showAddDrawer()"
      (closeDrawer)="showAddDrawer.set(false)"
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
  protected readonly loaded = this._loading.loaded;
  protected readonly connections = signal<any[]>([]);
  protected readonly showAddDrawer = signal(false);

  public ngOnInit() {
    void this.load();
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
    void this.load();
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
