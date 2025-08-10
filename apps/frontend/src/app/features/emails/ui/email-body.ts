import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { EmailType } from "common/src/lib/models";

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'email-body.html',
})
export class EmailBody {
  /** Email to display body for */
  @Input() public email!: EmailType;
}
