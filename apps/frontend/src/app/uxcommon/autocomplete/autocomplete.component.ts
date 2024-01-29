import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InputComponent } from '@uxcommon/input/input.component';

@Component({
  selector: 'pc-autocomplete',
  standalone: true,
  imports: [CommonModule, InputComponent],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent {
  @Input() public filterSvc:
    | {
        filter: (arg0: string) => Promise<string[]>;
      }
    | null
    | undefined;
  @Input() public placeholder: string = '';
  @Output() public valueChange = new EventEmitter<string>();

  protected matches: string[] = [];

  /**
   * Show the autocomplete list of tags that match the key.
   *
   * @param key - the key to match
   * @returns
   */
  protected async autoComplete(key: string) {
    this.matches = this.filterSvc && !!key ? await this.filterSvc.filter(key) : [];
  }

  protected handleClick(key: string) {
    this.valueChange.emit(key);
    this.matches = [];
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
    this.matches = [];
  }
}
