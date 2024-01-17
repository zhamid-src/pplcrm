import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() public tagsChange = new EventEmitter<string[]>();

  public add(tag: string) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.tagsChange && this.tagsChange.emit(this.tags);
    }
  }

  public clicked(tag: string) {
    console.log('click', tag);
  }

  public closed(tag: string) {
    this.remove(tag);
  }

  public onKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      const target = event.target as HTMLInputElement;
      let value = target.value;
      if (value.endsWith(',')) {
        value = value.slice(0, -1);
      }
      this.add(value);
      target.value = '';
    }
  }

  public remove(tag: string) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.tagsChange.emit(this.tags);
    }
  }
}
