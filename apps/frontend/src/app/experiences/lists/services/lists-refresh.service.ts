import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ListsRefreshService {
  private readonly _refresh$ = new Subject<void>();

  public trigger() {
    this._refresh$.next();
  }

  public get changes$() {
    return this._refresh$.asObservable();
  }
}

