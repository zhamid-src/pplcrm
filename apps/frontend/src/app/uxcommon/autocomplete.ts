import { Component, EventEmitter, Output, input, signal } from '@angular/core';
import { PPlCrmInput } from '@uxcommon/input';

@Component({
  selector: 'pc-autocomplete',
  imports: [PPlCrmInput],
  templateUrl: './autocomplete.html',
})
export class AutoComplete {
  /**
   * A reactive list of autocomplete matches.
   */
  protected readonly matches = signal<string[]>([]);

  /**
   * Whether to hide the autocomplete list.
   */
  protected hideAutoComplete = true;

  /**
   * A filtering service that provides suggestions based on user input.
   * Must implement a `filter()` method that returns a list of matches.
   */
  public filterSvc = input<TFILTER | null>(null);

  /**
   * The placeholder text for the input element.
   */
  public placeholder = input('');

  /**
   * Emits the selected value when a user selects or types something meaningful.
   */
  @Output() public valueChange = new EventEmitter<string>();

  /**
   * Shows the autocomplete list with matches based on the provided key.
   *
   * @param key - The string to filter matches by
   */
  protected async autoComplete(key: string) {
    console.log('autocomplete: ', key);
    const filterSvc = this.filterSvc();
    if (!filterSvc || !key?.length) return;

    const matches = await filterSvc.filter(key);
    console.log(matches);
    this.matches.set(matches);
  }

  /**
   * Handles user click on a suggestion in the autocomplete list.
   * Emits the selected value and resets the list.
   *
   * @param key - The selected suggestion
   */
  protected handleClick(key: string) {
    this.valueChange.emit(key);
    this.reset();
  }

  /**
   * Hides the autocomplete list after a short delay.
   *
   * This delay is important to allow click events on the suggestions
   * to be registered before the list disappears (avoiding lost focus issues).
   */
  protected hideAutoCompleteList() {
    setTimeout(() => (this.hideAutoComplete = true), 200);
  }

  /**
   * Handles keyboard input in the input field.
   * Emits the value when Enter or comma is pressed.
   * Otherwise, updates the autocomplete list.
   *
   * @param event - The keyboard event triggered on input
   */
  protected onKey(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    console.log(event);
    if (event.key === 'Enter' || event.key === ',') {
      this.valueChange.emit(target.value);
      target.value = '';
    }
    if (target.value?.length === 0) {
      this.reset();
    }
  }

  /**
   * Clears the list of autocomplete matches.
   */
  protected reset() {
    this.matches.set([]);
  }

  /**
   * Displays the autocomplete list.
   */
  protected showAutoCompleteList() {
    this.hideAutoComplete = false;
  }
}

/**
 * Type definition for a service that provides filtered results
 * based on a user-provided string key.
 */
type TFILTER = {
  /**
   * Function that filters a string and returns a Promise of matching results.
   *
   * @param arg0 - the string to filter by
   */
  filter: (arg0: string) => Promise<string[]>;
};
