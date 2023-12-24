import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { TagComponent } from "@uxcommon/tag/tag.component";

@Component({
  selector: "pc-tags",
  standalone: true,
  imports: [CommonModule, TagComponent],
  templateUrl: "./tags.component.html",
  styleUrl: "./tags.component.scss",
})
export class TagsComponent {
  @Input() readonly = false;
  @Input() allowDetele = true;
  @Input() tags: string[] = [];
  @Output() tagsChange = new EventEmitter<string[]>();

  private _tags = signal(this.tags);

  constructor() {
    console.log(this.tags);
  }

  clicked(tag: string) {
    console.log("click", tag);
  }

  closed(tag: string) {
    this.remove(tag);
  }

  add(tag: string) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.tagsChange.emit(this.tags);
    }
  }

  remove(tag: string) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.tagsChange.emit(this.tags);
    }
  }

  onKey(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === ",") {
      const target = event.target as HTMLInputElement;
      let value = target.value;
      if (value.endsWith(",")) {
        value = value.slice(0, -1);
      }
      this.add(value);
      target.value = "";
    }
  }
}
