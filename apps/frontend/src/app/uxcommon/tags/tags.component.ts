import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TagsGridService } from '@services/grid/tags-grid.service';
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
  @Input() public allowDetele = true;
  @Input() public readonly = false;
  @Input() public tags: string[] = [];
  @Input() public placeholder: string = 'Enter tags, separated by comma';
  @Input() public enableAutoComplete: boolean = false;

  @Output() public tagsChange = new EventEmitter<string[]>();
  @Output() public tagClicked = new EventEmitter<string>();

  protected matches: string[] = [];
  constructor(private tagSvc: TagsGridService) {}

  public add(rawTag: string) {
    const tag = rawTag.trim();
    if (tag.length > 0 && !this.tags.includes(tag)) {
      this.tags.unshift(tag);
      this.tagsChange && this.tagsChange.emit(this.tags);
    }
    this.matches = [];
  }

  public clicked(tag: string) {
    this.tagClicked && this.tagClicked.emit(tag);
  }

  public closed(tag: string) {
    setTimeout(() => {
      this.remove(tag);
    }, 500);
  }

  public onKey(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    let value = target.value;
    if (event.key === 'Enter' || event.key === ',') {
      if (value.indexOf(',') >= 0) {
        value = value.replace(',', '');
      }
      this.add(value);
      target.value = '';
    } else {
      this.autoComplete(value);
    }
  }

  public remove(tag: string) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.tagsChange.emit(this.tags);
    }
  }

  private async autoComplete(key: string) {
    if (!this.enableAutoComplete) {
      return;
    }
    if (key && key.length > 0) {
      const payload = (await this.tagSvc.match(key)) as { name: string }[];
      this.matches = payload.map((m) => m.name);
    } else {
      this.matches = [];
    }
  }
}
