import { GridApi } from '@ag-grid-community/core';

type UNDOTYPE = 'aggrid' | 'custom';

interface UndoElement<T> {
  rows: Partial<T>[];
  type: UNDOTYPE;
}

/**
 * An undo/redo manager for ag-grid.
 */
export class UndoManager<T> {
  private api: GridApi<Partial<T>> | undefined;
  private redoStack: UndoElement<T>[] = [];
  private undoStack: UndoElement<T>[] = [];

  /**
   * @description Add the current action to the undo stack.
   *
   * @param {UNDOTYPE} type - The type of action.
   * @param {Partial<T>[]} [rows=[]]
   */
  public pushRedo(type: UNDOTYPE, rows: Partial<T>[] = []) {
    this.redoStack.push({ type, rows });
  }

  /**
   * Add the current action to the undo stack.
   *
   * @param {UNDOTYPE} type - The type of action.
   * @param {Partial<T>[]} [rows=[]]
   */
  public pushUndo(type: UNDOTYPE, rows: Partial<T>[] = []) {
    this.undoStack.push({ type, rows });
  }

  /**
   * Redoes the last undone action
   */
  public redo() {
    if (!this.redoLength()) return;

    const redoElement = this.redoStack.pop()!;
    if (redoElement.type === 'aggrid') {
      this.api?.redoCellEditing();
    } else {
      const rows = redoElement.rows;
      this.api?.applyTransaction({ remove: rows });
    }
    this.pushUndo(redoElement.type, redoElement.rows);

    if (this.api?.getCurrentRedoSize() === 0) this.removeAgGridRedo();
  }

  /**
   * @description Get the length of the redo stack
   *
   * @returns {boolean} - Length of the redo stack
   */
  public redoLength() {
    return this.redoStack.length;
  }

  public reset() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Creates an instance of UndoManager. Should be called before using the undo manager.
   */
  public setAPI(api: GridApi<Partial<T>>) {
    this.api = api;
  }

  /**
   * Undoes the last action.
   */
  public undo() {
    if (!this.undoLength()) return;

    const undoElement = this.undoStack.pop()!;
    if (undoElement.type === 'aggrid') {
      this.api?.undoCellEditing();
    } else {
      const rows = undoElement.rows;
      this.api?.applyTransaction({ add: rows });
    }
    this.pushRedo(undoElement.type, undoElement.rows);

    // redo action can reset the undo stack.
    if (this.api?.getCurrentUndoSize() === 0) this.removeAgGridUndo();
  }

  /**
   * @description Get the length of the undo stack
   *
   * @returns {boolean} - Length of the undo stack
   */
  public undoLength() {
    return this.undoStack.length;
  }

  private removeAgGridRedo() {
    this.redoStack = this.redoStack.filter((element) => element.type !== 'aggrid');
  }

  private removeAgGridUndo() {
    this.undoStack = this.undoStack.filter((element) => element.type !== 'aggrid');
  }
}
