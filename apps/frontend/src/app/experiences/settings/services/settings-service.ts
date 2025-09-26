import { Injectable, computed, signal } from '@angular/core';
import { SettingsEntryType } from '@common';

import { TRPCService } from '../../../services/api/trpc-service';

export type TenantSettingsSnapshot = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class SettingsService extends TRPCService<TenantSettingsSnapshot> {
  private readonly snapshotSignal = signal<TenantSettingsSnapshot>({});
  private readonly pendingSignal = signal(false);

  public readonly snapshot = computed(() => this.snapshotSignal());
  public readonly isPending = computed(() => this.pendingSignal());

  public async load(force = false) {
    if (!force && Object.keys(this.snapshotSignal()).length) return this.snapshotSignal();

    this.pendingSignal.set(true);
    try {
      const data = (await this.api.settings.getSnapshot.query()) ?? {};
      this.snapshotSignal.set(data);
      return data;
    } finally {
      this.pendingSignal.set(false);
    }
  }

  public getValue<T = unknown>(key: string, fallback?: T) {
    const value = this.snapshotSignal()[key];
    return (value === undefined ? fallback : (value as T)) ?? fallback;
  }

  public async upsert(entries: SettingsEntryType[]) {
    if (!entries.length) return this.snapshotSignal();

    this.pendingSignal.set(true);
    try {
      const data = await this.api.settings.upsert.mutate({ entries });
      this.snapshotSignal.set(data ?? {});
      return data;
    } finally {
      this.pendingSignal.set(false);
    }
  }
}
