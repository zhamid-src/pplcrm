import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { form, submit, required, pattern, FormField } from '@angular/forms/signals';
import { TagsService } from '@experiences/tags/services/tags-service';

import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';

function randomHexColor(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  );
}

/** Fig. 10 "New tag" — a popup, not a routed page, so adding a tag never leaves the admin table. */
@Component({
  selector: 'pc-add-tag-dialog',
  imports: [PcInput, FormField, Icon],
  template: `<dialog #dlg class="modal">
    <div class="modal-box max-w-md">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-xl font-bold flex items-center gap-2">
          <pc-icon name="add-label" [size]="5" class="text-primary"></pc-icon>
          New tag
        </h3>
        <button class="btn btn-ghost btn-sm btn-circle" (click)="close()" type="button" aria-label="Close">
          <pc-icon name="x-mark" [size]="4"></pc-icon>
        </button>
      </div>

      <form (submit)="add($event)" class="flex flex-col gap-4" novalidate>
        <div class="flex flex-col gap-2">
          <label i18n class="label text-sm font-light">
            Enter a unique tag name (and optionally, give it a description)
          </label>
          <pc-input placeholder="Tag Name" i18n-placeholder [formField]="form.name"></pc-input>
          <pc-input placeholder="Optional description" i18n-placeholder [formField]="form.description"></pc-input>
          <div class="flex items-center gap-2">
            <label i18n class="label-text font-light text-sm">Colour</label>
            <input class="input input-bordered input-sm w-24" type="color" [formField]="form.color" />
            @if (form.color().invalid() && form.color().touched()) {
              <span i18n class="text-error text-xs">Use a value like #3366ff</span>
            }
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn btn-ghost" (click)="close()" [disabled]="isLoading()">Cancel</button>
          <button type="submit" class="btn btn-primary gap-2" [disabled]="isLoading()">
            @if (isLoading()) {
              <span class="loading loading-spinner loading-xs"></span>
            } @else {
              <pc-icon name="add-label" [size]="4"></pc-icon>
            }
            Add tag
          </button>
        </div>
      </form>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button (click)="close()">close</button>
    </form>
  </dialog>`,
})
export class AddTagDialog {
  private readonly alertSvc = inject(AlertService);
  private readonly tagSvc = inject(TagsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);

  private readonly dlgRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  private _loading = createLoadingGate();

  protected readonly payload = signal({
    name: '',
    description: '',
    color: randomHexColor(),
  });

  public readonly form = form(this.payload, (p) => {
    required(p.name);
    pattern(p.color, /^#([0-9a-fA-F]{6})$/);
  });

  protected isLoading = this._loading.visible;

  public readonly saved = output<void>();

  public open(): void {
    this.payload.set({ name: '', description: '', color: randomHexColor() });
    this.form().reset();
    this.dlgRef().nativeElement.showModal();
  }

  public close(): void {
    this.dlgRef().nativeElement.close();
  }

  protected async add(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    if (this.isLoading()) {
      return;
    }

    // force validation messages to appear
    this.form().markAsTouched();

    if (!this.form().valid) {
      return;
    }

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const formObj = this.payload();
          await this.tagSvc.add(formObj);
          await this.tagOptionsSvc.invalidate('tag');
          this.tagSvc.triggerRefresh();
          this.alertSvc.showSuccess('Tag added successfully.');
          this.saved.emit();
          this.close();
        } catch (err) {
          this.alertSvc.showError(
            err instanceof Error && err.message ? err.message : "We've hit an unknown error. Please try again.",
          );
        } finally {
          end();
        }
        return null;
      },
    });
  }
}
