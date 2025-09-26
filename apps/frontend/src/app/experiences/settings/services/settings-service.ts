import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SettingsEntryType } from '@common';

import { TRPCService } from '../../../services/api/trpc-service';

export type TenantSettingsSnapshot = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class SettingsService extends TRPCService<TenantSettingsSnapshot> {
  private readonly snapshotSubject = new BehaviorSubject<TenantSettingsSnapshot>({});
  private readonly pendingSubject = new BehaviorSubject<boolean>(false);

  public readonly snapshot$ = this.snapshotSubject.asObservable();
  public readonly isPending$ = this.pendingSubject.asObservable();

  public async load(force = false) {
    if (!force && Object.keys(this.snapshotSubject.value).length) return this.snapshotSubject.value;

    this.pendingSubject.next(true);
    try {
      const data = (await this.api.settings.getSnapshot.query()) ?? {};
      this.snapshotSubject.next(data);
      return data;
    } finally {
      this.pendingSubject.next(false);
    }
  }

  public getValue<T = unknown>(key: string, fallback?: T) {
    const value = this.snapshotSubject.value[key];
    return (value === undefined ? fallback : (value as T)) ?? fallback;
  }

  public async upsert(entries: SettingsEntryType[]) {
    if (!entries.length) return this.snapshotSubject.value;

    this.pendingSubject.next(true);
    try {
      const data = await this.api.settings.upsert.mutate({ entries });
      this.snapshotSubject.next(data ?? {});
      return data;
    } finally {
      this.pendingSubject.next(false);
    }
  }

  public snapshot(): TenantSettingsSnapshot {
    return this.snapshotSubject.value;
  }

  public pending(): boolean {
    return this.pendingSubject.value;
  }
}
