import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ListsRefreshService {
  /** Increments each time a refresh is requested. Consumers can effect() on this. */
  public readonly refreshCount = signal(0);

  public trigger() {
    this.refreshCount.update((n) => n + 1);
  }
}
