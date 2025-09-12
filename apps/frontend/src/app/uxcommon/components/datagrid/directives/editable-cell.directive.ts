import { Directive, HostListener, Input, inject } from '@angular/core';
import { EditingController } from '../controllers/editing.controller';

@Directive({
  selector: '[pcEditable]',
  standalone: true,
})
export class EditableCellDirective {
  private readonly editing = inject(EditingController);

  @Input({ required: true }) pcEditable!: {
    row: any;
    col: any;
    toId: (r: any) => string;
    coerce: (col: any, raw: any) => any;
    value: () => any; // current editingValue()
    setEditingCell: (v: { id: string; field: string } | null) => void;
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
    const { row, col, toId, setEditingCell } = this.pcEditable;
    if (!col?.field) return;
    // Respect col.editable for parity with grid logic
    if (!(col as any)?.editable) return;
    const id = toId(row);
    if (!id) return;
    setEditingCell({ id, field: col.field });
  }

  @HostListener('keydown.enter')
  async onEnter() {
    // prevent default handled by table navigation
    await this.commit();
  }

  @HostListener('keydown.esc')
  onEsc() {
    this.pcEditable.setEditingCell(null);
  }

  // Use focusout for bubbling behavior from inputs
  @HostListener('focusout')
  async onFocusOut() {
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
  }
}
