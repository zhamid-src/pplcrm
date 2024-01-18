import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-tag',
  standalone: true,
  imports: [CommonModule, IconsComponent, TagComponent],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss',
})
export class TagComponent {
  @Input() public allowDetele = true;
  @Output() public clickEvent = new EventEmitter<string>();
  @Output() public closeEvent = new EventEmitter<string>();
  @Input({ required: true }) public name!: string;

  protected destroy: boolean = false;

  public emitClick() {
    this.clickEvent.emit(this.name);
  }

  public emitClose() {
    this.destroy = true;
    this.closeEvent.emit(this.name);
  }
}
