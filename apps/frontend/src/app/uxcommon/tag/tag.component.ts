import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { IconsComponent } from "@uxcommon/icons/icons.component";

@Component({
  selector: "pc-tag",
  standalone: true,
  imports: [CommonModule, IconsComponent, TagComponent],
  templateUrl: "./tag.component.html",
  styleUrl: "./tag.component.scss",
})
export class TagComponent {
  @Input({ required: true }) name: string = "";
  @Input() allowDetele = true;

  @Output() clickEvent = new EventEmitter<string>();
  @Output() closeEvent = new EventEmitter<string>();

  emitClick() {
    this.clickEvent.emit(this.name);
  }

  emitClose() {
    this.closeEvent.emit(this.name);
  }
}
