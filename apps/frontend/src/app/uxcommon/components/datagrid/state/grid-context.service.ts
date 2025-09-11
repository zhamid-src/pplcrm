import { Injectable, computed } from '@angular/core';
import { GridStoreService } from '../services/grid-store.service';

@Injectable({ providedIn: 'root' })
export class GridContextService {
  constructor(public readonly store: GridStoreService) {}

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

