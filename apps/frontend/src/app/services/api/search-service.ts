/**
 * @fileoverview Global search state management service.
 * Provides centralized search functionality with reactive state management
 * using Angular signals for cross-component search coordination.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

/**
 * Centralized search state management service for application-wide search functionality.
 *
 * This service provides a reactive search state that can be shared across multiple
 * components, enabling coordinated search experiences throughout the application.
 * It uses Angular signals for efficient reactivity and automatic UI updates.
 *
 * **Key Features:**
 * - **Global Search State**: Centralized search term management
 * - **Reactive Updates**: Angular signals for automatic UI synchronization
 * - **Cross-Component Sync**: Share search state between components
 * - **Simple API**: Clear methods for search operations
 * - **Memory Efficient**: Lightweight signal-based implementation
 *
 * **Common Use Cases:**
 * - Global search bars that filter multiple views
 * - Data grids with search functionality
 * - List components with real-time filtering
 * - Search result coordination across tabs/views
 *
 * **Architecture:**
 * The service maintains a single source of truth for search state using Angular signals,
 * allowing any component to read the current search term reactively or update it
 * imperatively. This ensures all components stay synchronized automatically.
 *
 * @example
 * ```typescript
 * // In a search component
 * constructor(private searchService: SearchService) {}
 *
 * onSearchInput(term: string) {
 *   this.searchService.doSearch(term);
 * }
 *
 * clearSearch() {
 *   this.searchService.clearSearch();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a data grid component
 * constructor(private searchService: SearchService) {
 *   const searchTerm = toSignal(this.searchService.search$, { initialValue: '' });
 *   effect(() => this.filterData(searchTerm()));
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class SearchService {
  /**
   * Internal signal that holds the current search term.
   */
  private readonly searchSubject = new BehaviorSubject<string>('');
  private readonly searchInputSubject = new Subject<string>();

  public readonly search$ = this.searchSubject.asObservable();

  constructor() {
    this.searchInputSubject
      .pipe(
        map((value) => this.normalize(value)),
        distinctUntilChanged(),
        debounceTime(300),
      )
      .subscribe((value) => {
        if (value !== this.searchSubject.value) {
          this.searchSubject.next(value);
        }
      });
  }

  /**
   * Clears the current search term by setting it to an empty string.
   */
  public clearSearch(): void {
    if (this.searchSubject.value !== '') {
      this.searchSubject.next('');
    }
  }

  /**
   * Updates the search value with the provided string.
   *
   * @param value - The new search term to set.
   */
  public doSearch(value: string): void {
    this.searchInputSubject.next(value);
  }

  /**
   * Gets the current search value.
   *
   * @returns The current search string.
   */
  public getFilterText(): string {
    return this.searchSubject.value;
  }

  /**
   * Optional: immediate search update (bypasses debounce), e.g., on Enter key.
   */
  public doSearchImmediate(value: string): void {
    const norm = this.normalize(value);
    if (norm !== this.searchSubject.value) {
      this.searchSubject.next(norm);
    }
  }

  // Simple normalization to avoid redraws caused by cosmetic changes
  private normalize(v: string): string {
    return String(v ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}
