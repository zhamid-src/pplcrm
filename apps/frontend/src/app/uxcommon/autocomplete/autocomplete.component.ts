import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input, signal } from '@angular/core';
import { InputComponent } from '@uxcommon/input/input.component';

type TFILTER = {
  filter: (arg0: string) => Promise<string[]>;
};
@Component({
  selector: 'pc-autocomplete',
  standalone: true,
  imports: [CommonModule, InputComponent],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent {
  public filterSvc = input<TFILTER | null>(null);
  public placeholder = input('');

  @Output() public valueChange = new EventEmitter<string>();

  protected matches = signal<string[]>([]);

  /**
   * Show the autocomplete list of tags that match the key.
   *
   * @param key - the key to match
   * @returns
   */
  protected async autoComplete(key: string) {
    const filterSvc = this.filterSvc();
    if (!filterSvc || !key?.length) {
      return;
    }
    const matches = await filterSvc.filter(key);
    this.matches.set(matches);
  }

  protected handleClick(key: string) {
    this.valueChange.emit(key);
    this.reset();
  }

  /**
   * The event that's fired on every key press.
   * If the key is Enter or comma then we add the tag.
   * If the key is anything else then we show the autocomplete list.
   *
   * @param event
   */
  protected onKey(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Enter' || event.key === ',') {
      this.valueChange.emit(target.value);
      target.value = '';
    }
    if (target.value?.length === 0) {
      this.reset();
    }
  }

  protected reset() {
    this.matches.set([]);
  }
}
