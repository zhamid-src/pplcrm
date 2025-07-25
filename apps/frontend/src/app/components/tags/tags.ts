import { Component, EventEmitter, Input, OnInit, Output, inject, input } from '@angular/core';
import { AnimateIfDirective } from '@uxcommon/animate-if.directive';
import { AutoComplete } from '@uxcommon/autocomplete';

import { SingleTag, TagModel } from 'apps/frontend/src/app/components/tags/singletag';
import { TagsService } from 'apps/frontend/src/app/components/tags/tags-service';

@Component({
  selector: 'pc-tags',
  imports: [SingleTag, AutoComplete],
  templateUrl: './tags.html',
})
export class Tags implements OnInit {
  /**
   * If the list of tags can be deleted. It adds or remove the x button.
   * The default is true.
   */
  public allowDetele = input<boolean>(true);
  public animateRemoval = input<boolean>(true);

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
   * If the user adds a new tag then this event is emitted with the new tag.
   */
  @Output() public tagAdded = new EventEmitter<string>();

  /**
   * If the user clicks on a tag then this event is emitted with the tag name.
   * This component does not do anything else with this event.
   */
  @Output() public tagClicked = new EventEmitter<string>();

  /**
   * If the user removes a tag then this event is emitted with the tag that was removed.
   */
  @Output() public tagRemoved = new EventEmitter<string>();
  public tagSvc = inject(TagsService);

  /**
   * In case the parent wants to give a list of tags to start with.
   * This can also be used as a two-way binding
   */
  public tags = input<TagModel[]>([]);
  @Input() public tagNames: string[] = [];

  /**
   * If the list of tags changes then this event is emitted with the new list of tags.
   * This can be used by the parent to update its list of tags or simply as a notification
   * if the parent uses tags as a two-way binding.
   */
  @Output() public tagsChange = new EventEmitter<string[]>();

  ngOnInit() {
    for (const name of this.tagNames) {
      this.add(name);
    }
  }

  /**
   * Fetch tag suggestions based on user input using the backend TagsService.
   *
   * @param key - The input string to filter suggestions with.
   * @returns A promise that resolves to a list of tag name strings.
   */
  public async filter(key: string) {
    if (!key || key.length === 0) {
      return [];
    }
    const names = (await this.tagSvc.findByName(key)) as { name: string }[];
    return names.map((m) => m.name);
  }

  /**
   * Add a new tag to the list after cleaning input. If tag already exists, it is ignored.
   * Triggers `tagsChange` and `tagAdded` if a tag is added.
   *
   * @param tag - The raw tag string to be added.
   */
  protected add(tagName: string) {
    if (tagName.indexOf(',') >= 0) {
      tagName = tagName.replace(',', '').trim();
    }

    if (tagName.length === 0) return;

    const index = this.getTagIndexByName(tagName);
    if (index === -1) {
      const tag = new TagModel(tagName);
      this.tags().unshift(tag);
      this.tagsChange.emit(this.getTagNamesArray());
      this.tagAdded.emit(tagName);
    } else {
      // Bring tag that maches to the front.
      const [tag] = this.tags().splice(index, 1); // remove it
      this.tags().unshift(tag); // move to front
    }
  }

  private getTagNamesArray() {
    return this.tags().map((tag) => tag.name);
  }
  private getTagIndexByName(name: string): number {
    return this.tags().findIndex((tag) => tag.name === name);
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
    this.remove(tag);
  }

  /**
   * Remove a tag from the internal list and emit `tagsChange` and `tagRemoved`.
   *
   * @param tag - The tag to be removed.
   */
  protected remove(tagName: string) {
    const index = this.getTagIndexByName(tagName);
    if (index > -1) {
      this.tags().splice(index, 1);
      this.tagsChange.emit(this.getTagNamesArray());
      this.tagRemoved.emit(tagName);
    }
  }
}
