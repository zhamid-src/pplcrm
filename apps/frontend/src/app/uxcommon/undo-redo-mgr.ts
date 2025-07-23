import { GridApi } from '@ag-grid-community/core';

interface UndoElement<T> {
  rows: Partial<T>[];
  type: UNDOTYPE;
}

/**
 * An undo/redo manager for ag-Grid.
 * Supports both AG Grid’s built-in undo (`aggrid`) and custom row-based actions (`custom`).
 */
export class UndoManager<T> {
  /**
   * AG Grid API instance.
   */
  private api: GridApi<Partial<T>> | undefined;

  /**
   * Stack to keep track of redoable actions.
   */
  private redoStack: UndoElement<T>[] = [];

  /**
   * Stack to keep track of undoable actions.
   */
  private undoStack: UndoElement<T>[] = [];

  /**
   * Pushes a redo action onto the stack.
   *
   * @param type - Type of the action ('aggrid' or 'custom').
   * @param rows - The rows affected by the action (optional).
   */
  public pushRedo(type: UNDOTYPE, rows: Partial<T>[] = []) {
    this.redoStack.push({ type, rows });
  }

  /**
   * Pushes an undo action onto the stack.
   *
   * @param type - Type of the action ('aggrid' or 'custom').
   * @param rows - The rows affected by the action (optional).
   */
  public pushUndo(type: UNDOTYPE, rows: Partial<T>[] = []) {
    this.undoStack.push({ type, rows });
  }

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public redo() {
    if (!this.redoLength()) return;

    const redoElement = this.redoStack.pop()!;
    if (redoElement.type === 'aggrid') {
      this.api?.redoCellEditing();
    } else {
      this.api?.applyTransaction({ remove: redoElement.rows });
    }
    this.pushUndo(redoElement.type, redoElement.rows);

    if (this.api?.getCurrentRedoSize() === 0) this.removeAgGridRedo();
  }

  /**
   * Returns the number of redo actions in the stack.
   */
  public redoLength(): number {
    return this.redoStack.length;
  }

  /**
   * Clears both the undo and redo stacks.
   */
  public reset(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Assigns the AG Grid API instance to the manager.
   *
   * @param api - The grid API to use.
   */
  public setAPI(api: GridApi<Partial<T>>): void {
    this.api = api;
  }

  /**
   * Undoes the last action and moves it to the redo stack.
   * Supports both ag-Grid and custom undo.
   */
  public undo(): void {
    if (!this.undoLength()) return;

    const undoElement = this.undoStack.pop()!;
    if (undoElement.type === 'aggrid') {
      this.api?.undoCellEditing();
    } else {
      this.api?.applyTransaction({ add: undoElement.rows });
    }
    this.pushRedo(undoElement.type, undoElement.rows);

    if (this.api?.getCurrentUndoSize() === 0) this.removeAgGridUndo();
  }

  /**
   * Returns the number of undo actions in the stack.
   */
  public undoLength(): number {
    return this.undoStack.length;
  }

  /**
   * Removes all AG Grid redo actions from the stack.
   */
  private removeAgGridRedo(): void {
    this.redoStack = this.redoStack.filter((element) => element.type !== 'aggrid');
  }

  /**
   * Removes all AG Grid undo actions from the stack.
   */
  private removeAgGridUndo(): void {
    this.undoStack = this.undoStack.filter((element) => element.type !== 'aggrid');
  }
}

type UNDOTYPE = 'aggrid' | 'custom';
