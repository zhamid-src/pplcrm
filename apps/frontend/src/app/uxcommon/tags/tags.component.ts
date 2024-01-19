import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TagsBackendService } from '@services/backend/tags.service';
import { InputComponent } from '@uxcommon/input/input.component';
import { TagComponent } from '@uxcommon/tag/tag.component';

@Component({
  selector: 'pc-tags',
  standalone: true,
  imports: [CommonModule, TagComponent, InputComponent],
  templateUrl: './tags.component.html',
  styleUrl: './tags.component.scss',
})
export class TagsComponent {
  /**
   * If the list of tags can be deleted. It adds or remove the x button.
   * The default is true.
   */
  @Input() public allowDetele = true;
  /**
   * If this is set then an autocomplete list based on available tags will be shown.
   * The default is false.
   */
  @Input() public enableAutoComplete: boolean = false;
  /**
   * The placeholder text for the input field.
   * The default is 'Enter tags, separated by comma'.
   */
  @Input() public placeholder: string = 'Enter tags, separated by comma';
  /**
   * If this is set to true then we don't see the text input field that
   * allows users to add more tags. The default is false.
   */
  @Input() public readonly = false;
  /**
   * If the user clicks on a tag then this event is emitted with the tag name.
   * This component does not do anything else with this event.
   */
  @Output() public tagClicked = new EventEmitter<string>();
  /**
   * In case the parent wants to give a list of tags to start with.
   * This can also be used as a two-way binding
   */
  @Input() public tags: string[] = [];
  /**
   * If the list of tags changes then this event is emitted with the new list of tags.
   * This can be used by the parent to update its list of tags or simply as a notification
   * if the parent uses tags as a two-way binding.
   */
  @Output() public tagsChange = new EventEmitter<string[]>();

  /**
   * Used by autocomplete to show the list of matches.
   */
  protected matches: string[] = [];

  constructor(private tagSvc: TagsBackendService) {}

  /**
   * This adds a tag to the list of tags, removing any duplicates
   * and whitespaces. It also emits the new list of tags, if it has changed.
   * @param rawTag - the new tag to end to the list
   */
  protected add(rawTag: string) {
    const tag = rawTag.trim();
    if (tag.length > 0 && !this.tags.includes(tag)) {
      this.tags.unshift(tag);
      this.tagsChange && this.tagsChange.emit(this.tags);
    }
    this.matches = [];
  }

  /**
   * Emit the tagClicked event with the tag that was clicked.
   * This component does not do anything else with this event.
   * It is up to the parent component to decide what to do with it.
   *
   * @param tag - the tag that was clicked
   */
  protected clicked(tag: string) {
    this.tagClicked && this.tagClicked.emit(tag);
  }

  /**
   * Remove the tag that was closed after a delay.
   * We add the delay because we want to give the animation time to complete.
   *
   * @param tag - the tag that was closed
   */
  protected closed(tag: string) {
    setTimeout(() => this.remove(tag), 500);
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
    let value = target.value;
    if (event.key === 'Enter' || event.key === ',') {
      // If the user types really quickly then we might get a comma in the middle of the word.
      // We want to remove the comma and add the word.
      if (value.indexOf(',') >= 0) {
        value = value.replace(',', '');
      }
      this.add(value);
      target.value = '';
    } else {
      this.autoComplete(value);
    }
  }

  /**
   * Remove the tag from the list of tags and emit the new list of tags.
   *
   * @param tag - the tag to remove
   */
  protected remove(tag: string) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.tagsChange.emit(this.tags);
    }
  }

  /**
   * Show the autocomplete list of tags that match the key.
   *
   * @param key - the key to match
   * @returns
   */
  private async autoComplete(key: string) {
    if (!this.enableAutoComplete) {
      return;
    }
    if (key && key.length > 0) {
      const payload = (await this.tagSvc.findByName(key)) as { name: string }[];
      this.matches = payload.map((m) => m.name);
    } else {
      this.matches = [];
    }
  }
}
