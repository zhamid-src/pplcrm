import { GridApi } from 'ag-grid-community';
import { computed, signal } from '@angular/core';

/**
 * An undo/redo manager for ag-Grid.
 * Supports both AG Grid’s built-in undo (`aggrid`) and custom row-based actions (`custom`).
 */
export class UndoManager<T> {
  private readonly redoSize = signal(0);
  private readonly undoSize = signal(0);

  /**
   * AG Grid API instance.
   */
  private api: GridApi<Partial<T>> | undefined;

  public readonly canRedo = computed(() => this.redoSize() > 0);
  public readonly canUndo = computed(() => this.undoSize() > 0);

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

  /**
   * Assigns the AG Grid API instance to the manager.
   *
   * @param api - The grid API to use.
   */
  public initialize(api: GridApi<Partial<T>>): void {
    this.api = api;
    this.updateSizes();
  }

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

  public updateSizes() {
    this.undoSize.set(this.getUndoSize());
    this.redoSize.set(this.getRedoSize());
  }
}
