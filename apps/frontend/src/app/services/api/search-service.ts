/**
 * @fileoverview Global search state management service.
 * Provides centralized search functionality with reactive state management
 * using Angular signals for cross-component search coordination.
 */
import { Service, signal, debounced, effect } from '@angular/core';

/**
 * Centralized search state management service for application-wide search functionality.
 *
 * This service provides a reactive search state that can be shared across multiple
 * components, enabling coordinated search experiences throughout the application.
 * It uses Angular signals for efficient reactivity and automatic UI updates.
 */
@Service()
export class SearchService {
  // Source raw search term
  private readonly _rawSearch = signal<string>('');

  // Native debounced signal
  private readonly _debouncedSearch = debounced(() => this._rawSearch(), 300);

  /**
   * Internal signal that holds the current search term.
   * Kept as a WritableSignal to maintain backward compatibility with tests.
   */
  public readonly searchSignal = signal<string>('');

  constructor() {
    // Keep public searchSignal in sync with native debounced signal
    effect(() => {
      const val = this._debouncedSearch.value();
      if (val !== undefined) {
        this.searchSignal.set(val);
      }
    });
  }

  /**
   * Clears the current search term by setting it to an empty string.
   */
  public clearSearch(): void {
    if (this._rawSearch() !== '') {
      this._rawSearch.set('');
      this.searchSignal.set('');
    }
  }

  /**
   * Updates the search value with the provided string, debounced by 300 ms.
   *
   * @param value - The new search term to set.
   */
  public doSearch(value: string): void {
    const norm = this.normalize(value);
    if (norm !== this._rawSearch()) {
      this._rawSearch.set(norm);
    }
  }

  /**
   * Gets the current search value.
   *
   * @returns The current search string.
   */
  public getFilterText(): string {
    return this.searchSignal();
  }

  /**
   * Optional: immediate search update (bypasses debounce), e.g., on Enter key.
   */
  public doSearchImmediate(value: string): void {
    const norm = this.normalize(value);
    if (norm !== this._rawSearch()) {
      this._rawSearch.set(norm);
    }
    if (norm !== this.searchSignal()) {
      this.searchSignal.set(norm);
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
