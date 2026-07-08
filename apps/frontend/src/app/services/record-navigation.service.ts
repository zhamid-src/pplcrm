import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface RecordNavContext {
  entityKey: string;
  ids: string[];
  total: number;
}

interface StoredRecordNavContext {
  ids: string[];
  total: number;
}

/**
 * Remembers the filtered id list a grid handed off when the user opened a
 * record, so detail pages can walk "N of M filtered" without a round trip
 * through the grid. Survives a deep link/refresh via sessionStorage since
 * the grid's own filter state (GridStoreService) is destroyed on navigation.
 */
@Injectable({ providedIn: 'root' })
export class RecordNavigationService {
  private readonly context = signal<RecordNavContext | null>(null);

  setContext(entityKey: string, ids: string[], total: number): void {
    const next: RecordNavContext = { entityKey, ids, total };
    this.context.set(next);
    sessionStorage.setItem(this.storageKey(entityKey), JSON.stringify({ ids, total }));
  }

  positionOf(entityKey: string, id: string): { index: number; total: number } | null {
    const ctx = this.resolve(entityKey);
    if (!ctx) return null;
    const index = ctx.ids.indexOf(id);
    if (index === -1) return null;
    return { index: index + 1, total: ctx.total };
  }

  adjacentId(entityKey: string, id: string, direction: 'prev' | 'next'): string | null {
    const ctx = this.resolve(entityKey);
    if (!ctx) return null;
    const index = ctx.ids.indexOf(id);
    if (index === -1) return null;
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    return ctx.ids[targetIndex] ?? null;
  }

  // Read-only: `resolve` runs inside detail-page `computed`s, so it must never
  // write a signal (NG0600). On the deep-link/refresh path the in-memory context
  // is empty, so we fall back to sessionStorage and return the restored value
  // without caching it. `setContext` (called off the reactive path during the
  // grid handoff) is what populates the in-memory signal.
  private resolve(entityKey: string): RecordNavContext | null {
    const current = this.context();
    if (current?.entityKey === entityKey) return current;

    const raw = sessionStorage.getItem(this.storageKey(entityKey));
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isStoredRecordNavContext(parsed)) return null;

    return { entityKey, ids: parsed.ids, total: parsed.total };
  }

  private storageKey(entityKey: string): string {
    return `pc-record-nav:${entityKey}`;
  }
}

export interface RecordNavHandle {
  positionLabel: Signal<string | null>;
  hasPrev: Signal<boolean>;
  hasNext: Signal<boolean>;
  prevLabel: Signal<string>;
  nextLabel: Signal<string>;
  goToPrev(): void;
  goToNext(): void;
}

/**
 * Wires a `*-view` component's `id` signal up to the filtered-set pager on
 * `pc-detail-layout`. The entity's list route (e.g. `/people`) is derived
 * from the activated route itself - the same URL a grid was mounted at
 * when it captured the filtered id list - so this needs no route string of
 * its own to keep in sync. `noun` names the record in aria-labels (e.g.
 * "person" -> "Previous person").
 */
export function injectRecordNavigation(noun: string, id: Signal<string>): RecordNavHandle {
  const recordNav = inject(RecordNavigationService);
  const router = inject(Router);
  const route = inject(ActivatedRoute);

  const entityRoute = (): string => {
    const pathFromRoot = route.snapshot.pathFromRoot;
    const segments = Array.isArray(pathFromRoot)
      ? pathFromRoot.flatMap((r) => r.url.map((u) => u.path)).filter(Boolean)
      : [];
    if (segments.length > 0) {
      segments.pop(); // drop this record's own id segment
      return '/' + segments.join('/');
    }
    // Fallback for callers whose Router/ActivatedRoute doesn't expose a real url/pathFromRoot (e.g. test doubles).
    const url = typeof router.url === 'string' ? router.url : '';
    const [withoutFragment] = url.split('#');
    const [path] = (withoutFragment ?? url).split('?');
    return (path ?? url).replace(new RegExp(`/${id()}$`), '') || '/';
  };

  const positionLabel = computed<string | null>(() => {
    const pos = recordNav.positionOf(entityRoute(), id());
    return pos ? `${pos.index} of ${pos.total} filtered` : null;
  });
  const hasPrev = computed(() => recordNav.adjacentId(entityRoute(), id(), 'prev') !== null);
  const hasNext = computed(() => recordNav.adjacentId(entityRoute(), id(), 'next') !== null);

  const goTo = (direction: 'prev' | 'next'): void => {
    const base = entityRoute();
    const target = recordNav.adjacentId(base, id(), direction);
    if (target) void router.navigate([base, target]);
  };

  return {
    positionLabel,
    hasPrev,
    hasNext,
    prevLabel: computed(() => `Previous ${noun}`),
    nextLabel: computed(() => `Next ${noun}`),
    goToPrev: () => goTo('prev'),
    goToNext: () => goTo('next'),
  };
}

function isStoredRecordNavContext(value: unknown): value is StoredRecordNavContext {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate['ids']) &&
    candidate['ids'].every((id) => typeof id === 'string') &&
    typeof candidate['total'] === 'number'
  );
}
