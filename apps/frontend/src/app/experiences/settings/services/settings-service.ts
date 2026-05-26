import { signal, Service } from '@angular/core';

import { SettingsEntryType } from '@common';

import { TRPCService } from '../../../services/api/trpc-service';

export type TenantSettingsSnapshot = Record<string, unknown>;

@Service()
export class SettingsService extends TRPCService<TenantSettingsSnapshot> {
  public readonly snapshotSignal = signal<TenantSettingsSnapshot>({});
  private readonly isPendingSignal = signal<boolean>(false);

    
  public async load(force = false) {
    if (!force && Object.keys(this.snapshotSignal()).length) return this.snapshotSignal();

    this.isPendingSignal.set(true);
    try {
      const data = (await this.api.settings.getSnapshot.query()) ?? {};
      this.snapshotSignal.set(data);
      return data;
    } finally {
      this.isPendingSignal.set(false);
    }
  }

  public getValue<T = unknown>(key: string, fallback?: T) {
    const value = this.snapshotSignal()[key];
    return (value === undefined ? fallback : (value as T)) ?? fallback;
  }

  public async upsert(entries: SettingsEntryType[]) {
    if (!entries.length) return this.snapshotSignal();

    this.isPendingSignal.set(true);
    try {
      const data = await this.api.settings.upsert.mutate({ entries });
      this.snapshotSignal.set(data ?? {});
      return data;
    } finally {
      this.isPendingSignal.set(false);
    }
  }

  public snapshot(): TenantSettingsSnapshot {
    return this.snapshotSignal();
  }

  public pending(): boolean {
    return this.isPendingSignal();
  }
}
