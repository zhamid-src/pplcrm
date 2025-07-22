import { Injectable, signal } from '@angular/core';

/**
 * This service is used to share the search value between components.
 *
 * It's typically used by grid components to filter the data.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private _search = signal<string>('');

  constructor() {}

  /**
   * Get the search value.
   */
  public get search() {
    return this._search();
  }

  /**
   * Clear search
   */
  public clearSearch() {
    this._search.set('');
  }

  /**
   * Apply the search value
   * @param value
   */
  public doSearch(value: string) {
    this._search.set(value);
  }
}
