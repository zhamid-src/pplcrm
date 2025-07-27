import { Injectable, Signal, signal } from '@angular/core';

/**
 * A shared service for managing and distributing a search term across components.
 *
 * Commonly used in grid or list views to filter data. Provides both imperative
 * access (get/set) and reactive access via Angular signals.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchService {
  /**
   * Internal signal that holds the current search term.
   */
  private _search = signal<string>('');

  /**
   * Public readonly signal for reactive subscriptions.
   *
   * Example usage:
   * ```ts
   * effect(() => {
   *   const search = searchService.searchSignal();
   *   console.log('Search changed:', search);
   * });
   * ```
   */
  public readonly searchSignal: Signal<string> = this._search;

  /**
   * Gets the current search value.
   *
   * @returns The current search string.
   */
  public get search(): string {
    return this._search();
  }

  /**
   * Clears the current search term by setting it to an empty string.
   */
  public clearSearch(): void {
    this._search.set('');
  }

  /**
   * Updates the search value with the provided string.
   *
   * @param value - The new search term to set.
   */
  public doSearch(value: string): void {
    this._search.set(value);
  }
}
