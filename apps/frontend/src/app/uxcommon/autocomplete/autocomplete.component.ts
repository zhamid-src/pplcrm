import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input, signal } from '@angular/core';
import { InputComponent } from '@uxcommon/input/input.component';

type TFILTER = {
  filter: (arg0: string) => Promise<string[]>;
};
@Component({
    selector: 'pc-autocomplete',
    imports: [CommonModule, InputComponent],
    templateUrl: './autocomplete.component.html',
    styleUrl: './autocomplete.component.scss'
})
export class AutocompleteComponent {
  protected hideAutoComplete = true;
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

  /**
   * The user clicked on an item in the autocomplete list
   * We emit it for the parent to decide what to do with it
   */
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

  /**
   * Reset the autocomplete list
   */
  protected reset() {
    this.matches.set([]);
  }

  protected showAutoCompleteList() {
    this.hideAutoComplete = false;
  }

  //$hack:
  // This is a hack to hide the autocomplete list when the user clicks outside of the list.
  // We can't immediately hide because if the lost focus happens due to the user clicking
  // on an item in the autocomplete then the click event on the item will not fire.
  // By adding the delay, we make sure that the autocomplete list stays up for long enough
  // for the click event to fire.
  protected hideAutoCompleteList() {
    setTimeout(() => (this.hideAutoComplete = true), 200);
  }
}
