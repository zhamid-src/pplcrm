import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { IAuthUser } from "@common";

@Component({
  selector: 'pc-email-assignment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'email-assignment.html',
})
export class EmailAssignment {
  /** Available users for assignment */
  @Input() public users: IAuthUser[] = [];

  /** Currently assigned user ID */
  @Input() public assignedTo?: string;

  /** Event emitted when an assignment is made */
  @Output() public assign = new EventEmitter<string | null>();

  /**
   * Get the display name for an assigned user.
   */
  public getUserName(id?: string) {
    if (!id) return 'No Owner';
    return this.users.find((u) => u.id === id)?.first_name || 'No Owner';
  }
}
