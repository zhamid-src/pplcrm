import { GridApi } from '@ag-grid-community/core';
import { computed, signal } from '@angular/core';

/**
 * An undo/redo manager for ag-Grid.
 * Supports both AG Grid’s built-in undo (`aggrid`) and custom row-based actions (`custom`).
 */
export class UndoManager<T> {
  /**
   * AG Grid API instance.
   */
  private api: GridApi<Partial<T>> | undefined;

  private readonly _undoSize = signal(0);
  private readonly _redoSize = signal(0);

  readonly canUndo = computed(() => this._undoSize() > 0);
  readonly canRedo = computed(() => this._redoSize() > 0);

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public redo() {
    this.canRedo() && this.api?.redoCellEditing();
  }

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public undo() {
    this.canUndo() && this.api?.undoCellEditing();
  }

  /**
   * Returns the number of redo actions in the stack.
   */
  public getRedoSize(): number {
    return this.api?.getCurrentRedoSize() ?? 0;
  }

  /**
   * Returns the number of redo actions in the stack.
   */
  public getUndoSize(): number {
    return this.api?.getCurrentUndoSize() ?? 0;
  }

  public updateSizes() {
    this._undoSize.set(this.getUndoSize());
    this._redoSize.set(this.getRedoSize());
  }

  /**
   * Assigns the AG Grid API instance to the manager.
   *
   * @param api - The grid API to use.
   */
  public initialize(api: GridApi<Partial<T>>): void {
    this.api = api;
    this.updateSizes();
  }
}
