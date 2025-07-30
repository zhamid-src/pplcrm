import { GridApi } from 'ag-grid-community';
import { computed, signal } from '@angular/core';

/**
 * An undo/redo manager for ag-Grid.
 * Supports both AG Grid’s built-in undo (`aggrid`) and custom row-based actions (`custom`).
 */
export class UndoManager<T> {
  private readonly _redoSize = signal(0);
  private readonly _undoSize = signal(0);

  /**
   * AG Grid API instance.
   */
  private _api: GridApi<Partial<T>> | undefined;

  public readonly canRedo = computed(() => this._redoSize() > 0);
  public readonly canUndo = computed(() => this._undoSize() > 0);

  /**
   * Returns the number of redo actions in the stack.
   */
  public getRedoSize(): number {
    return this._api?.getCurrentRedoSize() ?? 0;
  }

  /**
   * Returns the number of redo actions in the stack.
   */
  public getUndoSize(): number {
    return this._api?.getCurrentUndoSize() ?? 0;
  }

  /**
   * Assigns the AG Grid API instance to the manager.
   *
   * @param api - The grid API to use.
   */
  public initialize(api: GridApi<Partial<T>>): void {
    this._api = api;
    this.updateSizes();
  }

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public redo() {
    this.canRedo() && this._api?.redoCellEditing();
  }

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public undo() {
    this.canUndo() && this._api?.undoCellEditing();
  }

  public updateSizes() {
    this._undoSize.set(this.getUndoSize());
    this._redoSize.set(this.getRedoSize());
  }
}
