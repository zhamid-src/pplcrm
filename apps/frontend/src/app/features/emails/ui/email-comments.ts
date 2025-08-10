import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { EmailCommentType } from "common/src/lib/models";

@Component({
  selector: 'pc-email-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'email-comments.html',
})
export class EmailComments {
  /** Comments to display */
  @Input() public comments: Partial<EmailCommentType>[] = [];

  /** Current comment text */
  @Input() public newComment = '';
  @Output() public newCommentChange = new EventEmitter<string>();

  /** Event emitted when a comment should be added */
  @Output() public addComment = new EventEmitter<void>();
}
