import { computed, signal } from '@angular/core';

/**
 * An undo/redo manager for ag-Grid.
 * Supports both AG Grid’s built-in undo (`aggrid`) and custom row-based actions (`custom`).
 */
export class UndoManager {
  private readonly redoSize = signal(0);
  private readonly undoSize = signal(0);

  public readonly canRedo = computed(() => this.redoSize() > 0);
  public readonly canUndo = computed(() => this.undoSize() > 0);

  /**
   * Returns the number of redo actions in the stack.
   */
  public getRedoSize(): number {
    return 0;
  }

  /**
   * Returns the number of redo actions in the stack.
   */
  public getUndoSize(): number {
    return 0;
  }

  /**
   * Assigns the AG Grid API instance to the manager.
   *
   * @param api - The grid API to use.
   */
  public initialize(_api: any): void {
    this.updateSizes();
  }

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public redo() {
    // no-op (AG Grid removed)
  }

  /**
   * Redoes the last undone action and moves it to the undo stack.
   * Supports both ag-Grid and custom redo.
   */
  public undo() {
    // no-op (AG Grid removed)
  }

  public updateSizes() {
    this.undoSize.set(this.getUndoSize());
    this.redoSize.set(this.getRedoSize());
  }
}
