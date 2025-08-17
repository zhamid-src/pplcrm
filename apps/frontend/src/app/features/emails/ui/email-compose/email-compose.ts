// pc-compose-email.component.ts
import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttachmentIconComponent } from '@icons/attachment-icon'; // your <pc-attachment-icon>
import { Icon } from '@icons/icon'; // your <pc-icon>
import { FileSizePipe } from '@uxcommon/pipes/filesize.pipe';

import { QuillModule } from 'ngx-quill';
import Quill from 'quill';

import { EmailActionsStore } from '../../services/store/email-actions.store';

@Component({
  selector: 'pc-compose-email',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule, Icon, AttachmentIconComponent, DecimalPipe, FileSizePipe],
  host: { ngSkipHydration: 'true' }, // avoids hydration mismatches with rich editors
  templateUrl: './email-compose.html',
  styleUrls: ['./email-compose.css'],
})
export class ComposeEmailComponent {
  private actions = inject(EmailActionsStore);
  private fb = inject(NonNullableFormBuilder);
  private quill!: Quill;

  public attachments = signal<File[]>([]);
  public dragOver = signal(false);
  @ViewChild('fileInput', { static: false }) public fileInput?: ElementRef<HTMLInputElement>;
  @Output() public finished = new EventEmitter<void>(); // notify parent to close
  public form = this.fb.group({
    to: [''],
    cc: [''],
    bcc: [''],
    subject: ['', [Validators.maxLength(998)]],
    html: [''],
  });
  public toolbarId = `compose-toolbar-${Math.random().toString(36).slice(2)}`;
  public modules = {
    toolbar: {
      container: `#${this.toolbarId}`,
      handlers: {
        undo: () => this.historyUndo(),
        redo: () => this.historyRedo(),
        attach: () => this.triggerAttach(),
      },
    },
    history: { delay: 500, maxStack: 200, userOnly: true },
  };
  public sending = signal(false);
  public showMore = signal(false);
  public totalSize = computed(() => Math.round(this.attachments().reduce((s, f) => s + f.size, 0)));

  public discard() {
    this.finished.emit(); // just close; keep draft handling for later if needed
  }

  public onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
  }

  public onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(true);
  }

  public onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files?.length) this.mergeFiles(e.dataTransfer.files);
  }

  // attachments
  public onFileChoose(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) this.mergeFiles(input.files);
    if (input) input.value = '';
  }

  public async onSend() {
    if (!this.validTo()) return;
    this.sending.set(true);
    try {
      const v = this.form.getRawValue();
      const input: ComposePayload = {
        to: this.parseEmails(v.to),
        cc: this.parseEmails(v.cc),
        bcc: this.parseEmails(v.bcc),
        subject: v.subject,
        html: v.html,
        attachments: this.attachments(),
      };
      await this.actions.sendEmail(input);
      this.finished.emit(); // close composer
    } finally {
      this.sending.set(false);
    }
  }

  public removeAttachment(index: number) {
    const arr = this.attachments().slice();
    arr.splice(index, 1);
    this.attachments.set(arr);
  }

  public saveDraft() {}

  public toggleMore() {
    this.showMore.update((v) => !v);
  }

  public validTo() {
    const to = this.form.get('to')?.value;
    return to && to.trim().length > 0;
  }

  protected onEditorCreated(q: Quill) {
    this.quill = q;
  }

  private historyRedo() {
    if (!this.quill) return;

    const history = this.quill.getModule('history');
    if (!history) return;
    (history as any).redo();
  }

  private historyUndo() {
    if (!this.quill) return;
    const history = this.quill.getModule('history');
    if (!history) return;
    (history as any).undo();
  }

  private mergeFiles(list: FileList) {
    this.attachments.set([...this.attachments(), ...Array.from(list)]);
  }

  private parseEmails(raw: string | null | undefined): string[] {
    return (raw || '')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private triggerAttach() {
    this.fileInput?.nativeElement.click();
  }
}

export type ComposePayload = {
  attachments: File[];
  bcc: string[];
  cc: string[];
  html: string; // keep HTML for simplicity; switch to Delta if you prefer
  subject: string;
  to: string[];
};
