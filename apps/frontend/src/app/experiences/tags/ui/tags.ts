import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AutoComplete } from '@uxcommon/components/autocomplete/autocomplete';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';

import { TagItem } from '@uxcommon/components/tags/tagitem';
import { TagPaletteService } from './tag-palette.service';

interface TagView {
  name: string;
  color: string | null;
}

@Component({
  selector: 'pc-tags',
  imports: [TagItem, AutoComplete],
  template: `@if (!readonly()) {
      <pc-autocomplete
        (valueChange)="add($event)"
        [placeholder]="placeholder()"
        [filterSvc]="enableAutoComplete() ? this : null"
      ></pc-autocomplete>
    }
    @let tagViews = displayTags();
    @if (tagViews.length) {
      <div class="my-1"></div>
      <div class="contents" [class.mt-2]="!readonly()">
        @if (!readonly()) {
          <span class="font-light text-gray-400 mr-1 text-sm">{{ type() === 'issue' ? 'Issues:' : 'Tags:' }}</span>
        }
        @for (tag of tagViews; track tag.name) {
          <pc-tagitem
            class="mr-1 mb-1"
            [name]="tag.name"
            [color]="tag.color"
            [canDelete]="canDelete()"
            [compact]="compact()"
            (click)="clicked(tag.name)"
            (close)="closed(tag.name)"
          ></pc-tagitem>
        }
        @if (limit() !== undefined && !expanded() && tags().length > limit()!) {
          @let remainingCount = tags().length - limit()!;
          <span
            class="badge badge-neutral badge-sm cursor-pointer mb-1 align-middle hover:bg-neutral-focus"
            (click)="expanded.set(true); $event.stopPropagation()"
          >
            +{{ remainingCount }}
          </span>
        }
      </div>
    } `,
})
export class Tags implements OnInit {
  protected displayedTags: string[] = [];
  protected expanded = signal(false);
  private readonly paletteSvc = inject(TagPaletteService);
  private readonly tagOptionsSvc = inject(TagOptionsService);

  public readonly tagAdded = output<string>();

  public readonly tagClicked = output<string>();

  public readonly tagRemoved = output<string>();

  public readonly tagsChange = output<string[]>();

  public animateRemoval = input<boolean>(true);

  public canDelete = input<boolean>(true);

  public enableAutoComplete = input<boolean>(true);

  public placeholder = input<string>('Enter tags, separated by comma');

  public readonly = input<boolean>(false);
  public readonly type = input<'tag' | 'issue'>('tag');
  public compact = input<boolean>(false);
  public tagSvc = inject(TagsService);
  public tags = input<string[]>([]);
  public limit = input<number | undefined>(undefined);

  protected displayTags(): TagView[] {
    const raw = this.tags() ?? [];
    const limitVal = this.limit();
    const isExpanded = this.expanded();
    const palette = this.paletteSvc.palette();
    const seen = new Set<string>();
    const out: TagView[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'string') continue;
      const name = entry.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const lower = name.toLowerCase();
      const color = palette[name] ?? palette[lower] ?? this.paletteSvc.colorFor(name);
      out.push({ name, color: color ?? null });
    }
    return limitVal !== undefined && !isExpanded ? out.slice(0, limitVal) : out;
  }

  constructor() {}

  public async filter(key: string) {
    if (!key || key.length === 0) {
      return [];
    }
    const names = (await this.tagSvc.findByName(key, this.type())) as { name: string }[];
    return names.map((m) => m.name);
  }

  public ngOnInit() {
    for (const name of this.tags()) {
      this.add(name);
    }
  }

  protected add(tagName: string) {
    if (!tagName || typeof tagName !== 'string') return;

    if (tagName.indexOf(',') >= 0) {
      tagName = tagName.replace(',', '').trim();
    }

    tagName = tagName.toLowerCase().trim();

    if (tagName.length === 0) return;

    const index = this.tags().findIndex((tag) => (tag || '').toLowerCase().trim() === tagName);
    if (index === -1) {
      this.tags().unshift(tagName);
      this.tagAdded.emit(tagName);
      // Invalidate the options cache so the grid's inline dropdown reflects this new value
      this.tagOptionsSvc.invalidate(this.type());
    } else {
      // Bring tag that maches to the front.
      const [tag] = this.tags().splice(index, 1); // remove it
      this.tags().unshift(tag); // move to front
    }
    this.tagsChange.emit(this.tags());
  }

  protected clicked(tag: string) {
    this.tagClicked.emit(tag);
  }

  protected closed(tag: string) {
    this.remove(tag);
  }

  protected remove(tagName: string) {
    const target = (tagName || '').toLowerCase().trim();
    const index = this.tags().findIndex((tag) => (tag || '').toLowerCase().trim() === target);
    if (index > -1) {
      const removed = this.tags().splice(index, 1)[0];
      this.tagsChange.emit(this.tags());
      this.tagRemoved.emit(removed);
    }
  }
}
