import { Directive, ElementRef, inject, input } from '@angular/core';
import { EditingController } from '../controllers/editing.controller';

@Directive({
  selector: '[pcEditable]',
  host: {
    '(click)': 'onClick()',
    '(keydown.enter)': 'onEnter()',
    '(keydown.esc)': 'onEsc()',
    '(focusout)': 'onFocusOut($event)',
    '(mousedown)': 'onMouseDown()',
    '(document:mouseup)': 'onMouseUp()',
  },
})
export class EditableCellDirective {
  private readonly editing = inject(EditingController);
  private readonly host = inject(ElementRef<HTMLElement>);
  private _isEditing = false;
  private isMouseDownInside = false;

  private get isEditing(): boolean {
    const p = this.pcEditable();
    if (p && typeof p.isEditingCell === 'function') {
      return p.isEditingCell();
    }
    return this._isEditing;
  }

  private set isEditing(val: boolean) {
    this._isEditing = val;
  }

  public readonly pcEditable = input.required<{
    row: any;
    col: any;
    toId: (r: any) => string;
    coerce: (col: any, raw: any) => any;
    value: () => any; // current editingValue()
    setEditingCell: (v: { id: string; field: string } | null) => void;
    setEditingValue: (v: any) => void;
    getCellValue: (row: any, col: any) => any;
    getEditingDisplayValue: (row: any, col: any) => any;
    createPayload: (row: any, key: string) => any;
    applyEdit: (id: string, data: any) => Promise<boolean>;
    updateEditedRow: (id: string, field: string | undefined, v: any) => void;
    updateWindow: (s: number, e: number) => void;
    startIndex: () => number;
    endIndex: () => number;
    showSuccess: (m: string) => void;
    showError: (m: string) => void;
    undo: () => void;
    customCommit?: (currentValue: any) => Promise<unknown>;
    isEditable?: () => boolean;
    isEditingCell?: () => boolean;
  }>();

  protected onMouseDown() {
    this.isMouseDownInside = true;
  }

  protected onMouseUp() {
    this.isMouseDownInside = false;
  }

  protected onClick() {
    const p = this.pcEditable();
    if (typeof p.isEditable === 'function' && !p.isEditable()) return;
    const { row, col, toId, setEditingCell, setEditingValue, getCellValue, getEditingDisplayValue } = p;
    if (!col?.field) return;
    // Respect col.editable for parity with grid logic
    if (!col?.editable) return;
    const id = toId(row);
    if (!id) return;
    try {
      const cur = getEditingDisplayValue ? getEditingDisplayValue(row, col) : getCellValue(row, col);
      const cloned = Array.isArray(cur) ? [...cur] : cur;
      setEditingValue(cloned);
    } catch {}
    setEditingCell({ id, field: col.field });
    this.isEditing = true;
  }

  protected async onEnter() {
    if (!this.isEditing) return;
    await this.commit();
  }

  protected onEsc() {
    if (!this.isEditing) return;
    this.isEditing = false;
    this.pcEditable().setEditingCell(null);
  }

  // Commit only when focus leaves the cell subtree
  protected async onFocusOut(ev: FocusEvent) {
    if (!this.isEditing) return;
    if (this.isMouseDownInside) return;
    const container = this.host.nativeElement;
    const next = ev.relatedTarget as Node | null;
    if (next && container.contains(next)) return;
    await this.commit();
  }

  private async commit() {
    const p = this.pcEditable();
    if (!p?.col?.field) return;
    const currentValue = p.coerce(p.col, p.value());
    if (typeof p.customCommit === 'function') {
      await p.customCommit(currentValue);
    } else {
      await this.editing.commitSingleCell(p.row, p.col, currentValue);
    }
    p.setEditingCell(null);
    this.isEditing = false;
  }
}
