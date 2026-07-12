import { Injectable, computed, inject } from '@angular/core';
import { GridStoreService } from '../services/grid-store.service';

@Injectable({ providedIn: 'root' })
export class GridContextService {
  // Injected first: the derived fields below read this.store at initialization.
  public readonly store = inject(GridStoreService);

  // Common derived state used across controllers/directives
  readonly displayedCount = this.store.displayedCount;
  readonly pageIndex = this.store.pageIndex;
  readonly rows = this.store.rows;
  readonly selectionStickyWidth = this.store.selectionStickyWidth;
  readonly colVisibility = this.store.colVisibility;
  readonly colWidths = this.store.colWidths;
  readonly sorting = this.store.sorting;
  readonly filterValues = this.store.filterValues;

  // Helpers
  readonly hasAnyFilter = computed(() => Object.keys(this.store.filterValues() || {}).length > 0);
}
