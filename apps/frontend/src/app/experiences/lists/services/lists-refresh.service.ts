import { signal, Service } from '@angular/core';

@Service()
export class ListsRefreshService {
  public readonly refreshCount = signal(0);

  public trigger() {
    this.refreshCount.update((n) => n + 1);
  }
}
