import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

interface DuplicateCounts {
  people: number;
  households: number;
  companies: number;
}

@Component({
  selector: 'pc-duplicate-selection',
  imports: [RouterLink, Icon],
  templateUrl: './duplicate-selection.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class DuplicateSelectionComponent implements OnInit {
  private personsSvc = inject(PersonsService);

  private readonly _loading = createLoadingGate();
  public readonly isLoading = this._loading.visible;
  public counts = signal<DuplicateCounts>({ people: 0, households: 0, companies: 0 });

  ngOnInit(): void {

    void this.loadOnInit();

  }


  private async loadOnInit(): Promise<void> {
    const end = this._loading.begin();

    try {
      const countsRes = await this.personsSvc.getDuplicateCounts();
      this.counts.set(countsRes);
    } catch (error) {
      console.error('Failed to load duplicate counts', error);
      // In case of error, we default to 0 (already set), but you could also show an error badge state
    } finally {
      end();
    }
  }
}
