import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
import { EditingController } from '../controllers/editing.controller';

@Directive({
  selector: '[pcEditable]',
  standalone: true,
})
export class EditableCellDirective {
  private readonly editing = inject(EditingController);
  private readonly host = inject(ElementRef<HTMLElement>);
  private isEditing = false;

  @Input({ required: true }) pcEditable!: {
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
  };

  @HostListener('dblclick')
  onDblClick() {
    const { row, col, toId, setEditingCell, setEditingValue, getCellValue, getEditingDisplayValue } = this.pcEditable;
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

  @HostListener('keydown.enter')
  async onEnter() {
    if (!this.isEditing) return;
    await this.commit();
  }

  @HostListener('keydown.esc')
  onEsc() {
    if (!this.isEditing) return;
    this.isEditing = false;
    this.pcEditable.setEditingCell(null);
  }

  // Commit only when focus leaves the cell subtree
  @HostListener('focusout', ['$event'])
  async onFocusOut(ev: FocusEvent) {
    if (!this.isEditing) return;
    const container = this.host.nativeElement;
    const next = ev.relatedTarget as Node | null;
    if (next && container.contains(next)) return;
    await this.commit();
  }

  private async commit() {
    const p = this.pcEditable;
    if (!p?.col?.field) return;
    await this.editing.commitSingleCell({
      row: p.row,
      col: p.col,
      currentValue: p.coerce(p.col, p.value()),
      toId: p.toId,
      createPayload: p.createPayload,
      applyEdit: p.applyEdit,
      updateEditedRowInCaches: p.updateEditedRow,
      updateTableWindow: p.updateWindow,
      startIndex: p.startIndex,
      endIndex: p.endIndex,
      showSuccess: p.showSuccess,
      showError: p.showError,
      undo: p.undo,
    });
    p.setEditingCell(null);
    this.isEditing = false;
  }
}
