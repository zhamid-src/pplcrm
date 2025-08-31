import { Component, OnInit, inject, input, output } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AutoComplete } from '@uxcommon/components/autocomplete/autocomplete';

import { TagItem } from './tagitem';

@Component({
  selector: 'pc-tags',
  imports: [TagItem, AutoComplete],
  template: `@if (!readonly()) {
      <pc-autocomplete
        (valueChange)="add($event)"
        [placeholder]="placeholder()"
        [filterSvc]="enableAutoComplete() ? tagSvc : null"
      ></pc-autocomplete>
    }
    @if (tags().length) {
      <div class="my-1"></div>
      <div class="contents" [class.mt-2]="!readonly()">
        @if (!readonly()) {
          <span class="font-light text-gray-400 mr-1 text-sm">Tags applied:</span>
        }
        @for (tag of tags(); track tag) {
          <pc-tagitem
            class="mr-1"
            [name]="tag"
            [canDelete]="canDelete()"
            (click)="clicked(tag)"
            (close)="closed(tag)"
          ></pc-tagitem>
        }
      </div>
    } `,
})
export class Tags implements OnInit {
  protected displayedTags: string[] = [];

  /**
   * If the user adds a new tag then this event is emitted with the new tag.
   */
  public readonly tagAdded = output<string>();

  /**
   * If the user clicks on a tag then this event is emitted with the tag name.
   * This component does not do anything else with this event.
   */
  public readonly tagClicked = output<string>();

  /**
   * If the user removes a tag then this event is emitted with the tag that was removed.
   */
  public readonly tagRemoved = output<string>();

  /**
   * If the list of tags changes then this event is emitted with the new list of tags.
   * This can be used by the parent to update its list of tags or simply as a notification
   * if the parent uses tags as a two-way binding.
   */
  public readonly tagsChange = output<string[]>();

  public animateRemoval = input<boolean>(true);

  /**
   * If the list of tags can be deleted. It adds or remove the x button.
   * The default is true.
   */
  public canDelete = input<boolean>(true);

  /**
   * If this is set then an autocomplete list based on available tags will be shown.
   * The default is false.
   */
  public enableAutoComplete = input<boolean>(true);

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
  public tagSvc = inject(TagsService);
  public tags = input<string[]>([]);

  constructor() {
    /*
    effect(() => {
      console.log('effect: ', this.tagNames);
      const tags = this.tagNames();
      const added = tags.filter((tag) => !this.displayedTags.includes(tag));
      const removed = this.displayedTags.filter((tag) => !tags.includes(tag));

      added.forEach((tag) => this.add(tag));
      removed.forEach((tag) => this.remove(tag));

      this.displayedTags = tags;
    });
    */
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

  public ngOnInit() {
    for (const name of this.tags()) {
      this.add(name);
    }
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

    const index = this.tags().findIndex((tag) => tag === tagName);
    if (index === -1) {
      this.tags().unshift(tagName);
      this.tagAdded.emit(tagName);
    } else {
      // Bring tag that maches to the front.
      const [tag] = this.tags().splice(index, 1); // remove it
      this.tags().unshift(tag); // move to front
    }
    this.tagsChange.emit(this.tags());
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
    const index = this.tags().findIndex((tag) => tag === tagName);
    if (index > -1) {
      this.tags().splice(index, 1);
      this.tagsChange.emit(this.tags());
      this.tagRemoved.emit(tagName);
    }
  }
}
