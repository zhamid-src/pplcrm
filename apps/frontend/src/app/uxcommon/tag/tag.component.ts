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
  @Input() animate = true;

  protected destroy: boolean = false;

  public emitClick() {
    this.clickEvent.emit(this.name);
  }

  public emitClose() {
    // Destroy here sets the animation by adding the class 'destroy' to the tag
    // It does mean that the tag should be removed from the array in the parent component
    // after some delay, so that the animation can complete
    this.destroy = true;
    this.closeEvent.emit(this.name);
  }
}
