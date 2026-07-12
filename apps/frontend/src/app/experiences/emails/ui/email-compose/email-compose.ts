// pc-compose-email.component.ts
import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { AttachmentIconComponent } from '@icons/attachment-icon'; // your <pc-attachment-icon>
import { Icon } from '@icons/icon'; // your <pc-icon>
import { ConfirmDialogService } from '../../../../services/shared-dialog.service';
import { Swap } from '@uxcommon/components/swap/swap';
import { FileSizePipe } from '@uxcommon/pipes/filesize.pipe';

import { ContentChange, QuillModule } from 'ngx-quill';
import Quill from 'quill';

import { EmailActionsStore } from '../../services/store/email-actions.store';

/** RFC 5322 practical ceiling for a header line. */
const SUBJECT_MAX_LENGTH = 998;

const EMPTY_COMPOSE = { to: '', cc: '', bcc: '', subject: '', html: '' };

/** Narrows Quill's untyped history module to the undo/redo surface we call. */
function isHistoryModule(value: unknown): value is { redo(): void; undo(): void } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'undo' in value &&
    typeof value.undo === 'function' &&
    'redo' in value &&
    typeof value.redo === 'function'
  );
}

@Component({
  selector: 'pc-compose-email',
  imports: [FormField, QuillModule, Icon, AttachmentIconComponent, DecimalPipe, FileSizePipe, Swap],
  host: { ngSkipHydration: 'true' }, // avoids hydration mismatches with rich editors
  templateUrl: './email-compose.html',
  styleUrls: ['./email-compose.css'],
})
export class ComposeEmailComponent {
  private actions = inject(EmailActionsStore);
  private dialogs = inject(ConfirmDialogService);
  private draftIdSignal = signal<string | null>(null);
  private quill = signal<Quill | null>(null);
  /** Last HTML applied to or read from the editor; breaks the payload↔editor sync loop. */
  private lastEditorHtml: string | null = null;

  public readonly finished = output<void>();

  public readonly draftId = input<string | null>(null);
  public readonly initial = input<ComposeInitial | null>(null);

  public attachments = signal<File[]>([]);
  public dragOver = signal(false);
  public readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  /** Raw compose payload; the signal form wraps this. */
  public readonly payload = signal({ ...EMPTY_COMPOSE });
  public readonly form = form(this.payload, (p) => {
    maxLength(p.subject, SUBJECT_MAX_LENGTH);
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
  public showHeader = signal(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  public showMore = signal(false);
  public totalSize = computed(() => Math.round(this.attachments().reduce((s, f) => s + f.size, 0)));
  public readonly validTo = computed(() => this.payload().to.trim().length > 0);

  constructor() {
    // Replaces the @Input() set draftId setter
    effect(() => {
      const id = this.draftId();
      if (id) {
        void this.loadDraft(id);
      } else {
        this.draftIdSignal.set(null);
        this.payload.set({ ...EMPTY_COMPOSE });
        this.form().reset();
        this.attachments.set([]);
      }
    });

    // Replaces the @Input() set initial setter
    effect(() => {
      const value = this.initial();
      if (!value) return;
      this.payload.set({
        to: value.to ?? '',
        cc: value.cc ?? '',
        bcc: value.bcc ?? '',
        subject: value.subject ?? '',
        html: value.html ?? '',
      });
    });

    // Push programmatic payload changes (draft load, reset, reply prefill) into Quill.
    // User edits arrive via onContentChanged, which records lastEditorHtml first, so
    // this only writes when the change did not originate in the editor.
    effect(() => {
      const html = this.payload().html;
      const editor = this.quill();
      if (!editor || html === this.lastEditorHtml) return;
      this.lastEditorHtml = html;
      editor.setContents(editor.clipboard.convert({ html }), 'silent');
    });
  }

  public async delete(): Promise<void> {
    const draftId = this.draftIdSignal();
    const isDirty = this.form().dirty();
    if (!isDirty && !draftId) {
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
      if (draftId) {
        try {
          await this.actions.deleteDraft(draftId);
        } catch (e) {
          console.error('Failed to delete draft', e);
        }
      }
      this.finished.emit();
    }
  }

  public async discard(): Promise<void> {
    return this.delete();
  }

  public async loadDraft(id: string): Promise<void> {
    const d = await this.actions.getDraft(id);
    this.payload.set({
      to: (d.to_list || []).join(', '),
      cc: (d.cc_list || []).join(', '),
      bcc: (d.bcc_list || []).join(', '),
      subject: d.subject || '',
      html: d.body_html || '',
    });
    this.draftIdSignal.set(d.id);
    this.form().reset(); // clears dirty/touched (was markAsPristine)
  }

  public onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
  }

  public onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }

  public onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files?.length) this.mergeFiles(e.dataTransfer.files);
  }

  // attachments
  public onFileChoose(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) this.mergeFiles(input.files);
    if (input) input.value = '';
  }

  public onSend(): void {
    if (!this.validTo()) return;
    const v = this.payload();
    const input: ComposePayload = {
      to: this.parseEmails(v.to),
      cc: this.parseEmails(v.cc),
      bcc: this.parseEmails(v.bcc),
      subject: v.subject,
      html: v.html,
      attachments: this.attachments(),
    };
    void this.actions.sendEmail(input);
    this.finished.emit(); // close composer immediately
  }

  public removeAttachment(index: number): void {
    const arr = this.attachments().slice();
    arr.splice(index, 1);
    this.attachments.set(arr);
  }

  public async saveDraft(): Promise<void> {
    const v = this.payload();
    const input: DraftPayload = {
      id: this.draftIdSignal() ?? undefined,
      to: this.parseEmails(v.to),
      cc: this.parseEmails(v.cc),
      bcc: this.parseEmails(v.bcc),
      subject: v.subject,
      html: v.html,
    };
    const res = await this.actions.saveDraft(input);
    this.draftIdSignal.set(res.id);
  }

  public toggleHeader(): void {
    this.showHeader.update((v) => !v);
  }

  public toggleMore(): void {
    this.showMore.update((v) => !v);
  }

  protected onContentChanged(event: ContentChange): void {
    const html = event.html ?? '';
    this.lastEditorHtml = html;
    if (this.payload().html === html) return;
    this.form.html().value.set(html);
    this.form.html().markAsDirty();
  }

  protected onEditorCreated(q: Quill): void {
    this.quill.set(q);
  }

  private historyRedo(): void {
    const history = this.quill()?.getModule('history');
    if (isHistoryModule(history)) history.redo();
  }

  private historyUndo(): void {
    const history = this.quill()?.getModule('history');
    if (isHistoryModule(history)) history.undo();
  }

  private mergeFiles(list: FileList): void {
    this.attachments.set([...this.attachments(), ...Array.from(list)]);
  }

  private parseEmails(raw: string | null | undefined): string[] {
    return (raw || '')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private triggerAttach(): void {
    this.fileInput()?.nativeElement.click();
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
