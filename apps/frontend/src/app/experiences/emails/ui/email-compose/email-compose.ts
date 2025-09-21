// pc-compose-email.component.ts
import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, Input, ViewChild, computed, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttachmentIconComponent } from '@icons/attachment-icon'; // your <pc-attachment-icon>
import { Icon } from '@icons/icon'; // your <pc-icon>
import { ConfirmDialogService } from '../../../../services/shared-dialog.service';
import { Swap } from '@uxcommon/components/swap/swap';
import { FileSizePipe } from '@uxcommon/pipes/filesize.pipe';

import { QuillModule } from 'ngx-quill';
import Quill from 'quill';

import { EmailActionsStore } from '../../services/store/email-actions.store';

@Component({
  selector: 'pc-compose-email',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule, Icon, AttachmentIconComponent, DecimalPipe, FileSizePipe, Swap],
  host: { ngSkipHydration: 'true' }, // avoids hydration mismatches with rich editors
  templateUrl: './email-compose.html',
  styleUrls: ['./email-compose.css'],
})
export class ComposeEmailComponent {
  private actions = inject(EmailActionsStore);
  private dialogs = inject(ConfirmDialogService);
  private draftIdSignal = signal<string | null>(null);
  private fb = inject(NonNullableFormBuilder);
  private quill!: Quill;

  public readonly finished = output<void>();

  public attachments = signal<File[]>([]);
  public dragOver = signal(false);
  @ViewChild('fileInput', { static: false }) public fileInput?: ElementRef<HTMLInputElement>;
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
  public showHeader = signal(true);
  public showMore = signal(false);
  public totalSize = computed(() => Math.round(this.attachments().reduce((s, f) => s + f.size, 0)));

  @Input() public set draftId(id: string | null) {
    if (id) {
      void this.loadDraft(id);
    } else {
      this.draftIdSignal.set(null);
      this.form.reset({ to: '', cc: '', bcc: '', subject: '', html: '' });
      this.attachments.set([]);
    }
  }

  @Input() public set initial(value: ComposeInitial | null) {
    if (!value) return;
    this.form.patchValue({
      to: value.to ?? '',
      cc: value.cc ?? '',
      bcc: value.bcc ?? '',
      subject: value.subject ?? '',
      html: value.html ?? '',
    });
  }

  public async delete() {
    const hasDraft = !!this.draftIdSignal();
    const isDirty = this.form.dirty;
    if (!isDirty && !hasDraft) {
      this.finished.emit();
      return;
    }
    const ok = await this.dialogs.confirm({
      title: 'Discard draft?',
      message: 'Your changes will be permanently removed.',
      variant: 'danger',
      icon: 'trash',
      confirmText: 'Discard',
      cancelText: 'Cancel',
      allowBackdropClose: false,
    });
    if (ok) {
      if (hasDraft) {
        try {
          await this.actions.deleteDraft(this.draftIdSignal()!);
        } catch (e) {
          console.error('Failed to delete draft', e);
        }
      }
      this.finished.emit();
    }
  }

  public async discard() {
    return this.delete();
  }

  public async loadDraft(id: string) {
    const d = await this.actions.getDraft(id);
    this.form.patchValue({
      to: (d.to_list || []).join(', '),
      cc: (d.cc_list || []).join(', '),
      bcc: (d.bcc_list || []).join(', '),
      subject: d.subject || '',
      html: d.body_html || '',
    });
    this.draftIdSignal.set(d.id);
    this.form.markAsPristine();
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
    } catch {
      // Error surfaced via EmailActionsStore
    } finally {
      this.sending.set(false);
    }
  }

  public removeAttachment(index: number) {
    const arr = this.attachments().slice();
    arr.splice(index, 1);
    this.attachments.set(arr);
  }

  public async saveDraft() {
    const v = this.form.getRawValue();
    const input: DraftPayload = {
      id: this.draftIdSignal() || undefined,
      to: this.parseEmails(v.to),
      cc: this.parseEmails(v.cc),
      bcc: this.parseEmails(v.bcc),
      subject: v.subject,
      html: v.html,
    };
    const res = await this.actions.saveDraft(input);
    this.draftIdSignal.set(res.id);
  }

  public toggleHeader() {
    this.showHeader.update((v) => !v);
  }

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

export type ComposeInitial = {
  bcc?: string;
  cc?: string;
  html?: string;
  subject?: string;
  to?: string;
};

export type ComposePayload = {
  attachments: File[];
  bcc: string[];
  cc: string[];
  html: string; // keep HTML for simplicity; switch to Delta if you prefer
  subject: string;
  to: string[];
};

export type DraftPayload = {
  bcc: string[];
  cc: string[];
  html: string;
  id?: string;
  subject: string;
  to: string[];
};
