import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BypassHtmlSanitizerPipe } from '@pipes/svg-html.pipe';
import { IconName, icons } from './icons';

@Component({
  selector: 'pc-icon',
  standalone: true,
  imports: [CommonModule, BypassHtmlSanitizerPipe],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss',
})
export class IconsComponent {
  @Input({ required: true }) public name!: IconName;
  @Input() public size: number = 6;

  public getSvg() {
    return icons[this.name];
  }
}
