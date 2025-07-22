
import { Component, EventEmitter, Output, input, inject } from '@angular/core';
import { TagsService } from '@services/backend/tags.service';
import { AutocompleteComponent } from '@uxcommon/autocomplete/autocomplete.component';
import { TagComponent } from '@uxcommon/tag/tag.component';

@Component({
    selector: 'pc-tags',
    imports: [TagComponent, AutocompleteComponent],
    templateUrl: './tags.component.html',
    styleUrl: './tags.component.css'
})
export class TagsComponent {
  tagSvc = inject(TagsService);

  /**
   * If the list of tags can be deleted. It adds or remove the x button.
   * The default is true.
   */
  public allowDetele = input<boolean>(true);
  /**
   * If this is set then an autocomplete list based on available tags will be shown.
   * The default is false.
   */
  public enableAutoComplete = input<boolean>(false);
  /**
   * The placeholder text for the input field.
   * The default is 'Enter tags, separated by comma'.
   */
  public placeholder = input<string>('Enter tags, separated by comma');
  /**
   * If this is set to true then we don't see the text input field that
   * allows users to add more tags. The default is false.
   */
  public readonly = input<boolean>(false);
  /**
   * If the user clicks on a tag then this event is emitted with the tag name.
   * This component does not do anything else with this event.
   */
  @Output() public tagClicked = new EventEmitter<string>();

  public animateRemoval = input<boolean>(true);
  public animate = input<boolean>(true);

  /**
   * In case the parent wants to give a list of tags to start with.
   * This can also be used as a two-way binding
   */
  public tags = input<string[]>([]);
  /**
   * If the list of tags changes then this event is emitted with the new list of tags.
   * This can be used by the parent to update its list of tags or simply as a notification
   * if the parent uses tags as a two-way binding.
   */
  @Output() public tagsChange = new EventEmitter<string[]>();

  /**
   * If the user adds a new tag then this event is emitted with the new tag.
   */
  @Output() public tagAdded = new EventEmitter<string>();

  /**
   * If the user removes a tag then this event is emitted with the tag that was removed.
   */
  @Output() public tagRemoved = new EventEmitter<string>();

  /**
   * This adds a tag to the list of tags, removing any duplicates
   * and whitespaces. It also emits the new list of tags, if it has changed.
   * @param rawTag - the new tag to end to the list
   */
  protected add(tag: string) {
    // If the user types really quickly then we might get a comma in the middle of the word.
    // We want to remove the comma and add the word.
    if (tag.indexOf(',') >= 0) {
      tag = tag.replace(',', '').trim();
    }
    if (tag.length > 0 && !this.tags().includes(tag)) {
      this.tags().unshift(tag);
      this.tagsChange.emit(this.tags());
      this.tagAdded.emit(tag);
    }
  }

  public async filter(key: string) {
    if (!key || key.length === 0) {
      return [];
    }
    console.log('filter', key);
    console.log(this.tagSvc);
    const names = (await this.tagSvc.findByName(key)) as { name: string }[];
    return names.map((m) => m.name);
  }

  /**
   * Emit the tagClicked event with the tag that was clicked.
   * This component does not do anything else with this event.
   * It is up to the parent component to decide what to do with it.
   *
   * @param tag - the tag that was clicked
   */
  protected clicked(tag: string) {
    this.tagClicked.emit(tag);
  }

  /**
   * Remove the tag that was closed after a delay.
   * We add the delay because we want to give the animation time to complete.
   *
   * @param tag - the tag that was closed
   */
  protected closed(tag: string) {
    const duration = this.animateRemoval() ? 500 : 100;
    setTimeout(() => this.remove(tag), duration);
  }

  /**
   * Remove the tag from the list of tags and emit the new list of tags.
   *
   * @param tag - the tag to remove
   */
  protected remove(tag: string) {
    const index = this.tags().indexOf(tag);
    if (index > -1) {
      this.tags().splice(index, 1);
      this.tagsChange.emit(this.tags());
      this.tagRemoved.emit(tag);
    }
  }
}
