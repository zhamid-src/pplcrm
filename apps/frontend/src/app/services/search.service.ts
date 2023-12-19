import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class SearchService {
  private _search = signal<string>("");

  get search() {
    return this._search();
  }

  doSearch(value: string) {
    this._search.set(value);
  }

  clearSearch() {
    this._search.set("");
  }

  constructor() {}
}
