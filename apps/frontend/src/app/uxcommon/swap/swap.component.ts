import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IconsComponent } from "../icons/icons.component";

@Component({
  selector: "pplcrm-swap",
  standalone: true,
  imports: [CommonModule, FormsModule, IconsComponent],
  templateUrl: "./swap.component.html",
  styleUrl: "./swap.component.scss",
})
export class SwapComponent {
  @Input() public animation: "flip" | "rotate" = "rotate";
  @Input({ required: true }) public swapOnIcon: string | undefined;
  @Input({ required: true }) public swapOffIcon: string | undefined;

  @Input() checked: boolean = false;
  @Output() clickEvent = new EventEmitter();

  emitClick() {
    this.clickEvent.emit();
  }
}
