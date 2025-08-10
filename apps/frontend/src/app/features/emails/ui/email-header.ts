import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { IAuthUser } from "@common";
import { EmailType } from "common/src/lib/models";
import { EmailAssignment } from "./email-assignment";

@Component({
  selector: 'pc-email-header',
  standalone: true,
  imports: [CommonModule, EmailAssignment],
  templateUrl: 'email-header.html',
})
export class EmailHeader {
  /** Email to display details for */
  @Input() public email!: EmailType;

  /** Available users for assignment */
  @Input() public users: IAuthUser[] = [];

  /** Notify parent when assignment changes */
  @Output() public assign = new EventEmitter<string | null>();
}
