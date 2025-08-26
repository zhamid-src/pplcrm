/**
 * @file Reusable dialog service for confirm/alert/prompt using <dialog>.
 */
import { Injectable, signal } from '@angular/core';
import type { PcIconNameType } from '@uxcommon/components/icons/icons.index';

export interface BaseDialogOptions {
  allowBackdropClose?: boolean; // default true for alert/prompt, false for danger confirm
  cancelText?: string; // default per type
  confirmText?: string; // default per type
  icon?: PcIconNameType; // optional icon name for <pc-icon>
  message?: string;
  title: string;
  variant?: DialogVariant;
}

export interface DialogState {
  allowBackdropClose: boolean;
  cancelText: string;
  confirmText: string;
  defaultValue?: string;
  icon?: PcIconNameType;

  // prompt
  inputPlaceholder?: string;
  message?: string;
  title: string;
  type: DialogType;
  variant: DialogVariant;
}

export interface PromptOptions extends BaseDialogOptions {
  defaultValue?: string;
  inputPlaceholder?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  /** Internal resolver for the pending promise */
  private _resolve: ((value?: any) => void) | null = null;

  /** Open/close flag observed by the host component */
  public readonly isOpen = signal(false);

  /** Current dialog state */
  public readonly state = signal<DialogState | null>(null);

  /** Open an alert dialog. Resolves when the user clicks OK or backdrop if allowed. */
  public alert(opts: BaseDialogOptions): Promise<void> {
    this.open({
      type: 'alert',
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? 'info',
      icon: opts.icon ?? this.defaultIconFor(opts.variant ?? 'info'),
      allowBackdropClose: opts.allowBackdropClose ?? true,
      confirmText: opts.confirmText ?? 'OK',
      cancelText: opts.cancelText ?? '',
    });
    return new Promise<void>((resolve) => (this._resolve = resolve));
  }

  public cancel(): void {
    // Normalize cancel values per dialog type
    const st = this.state();
    if (st?.type === 'confirm') this._resolve?.(false);
    else if (st?.type === 'alert') this._resolve?.();
    else if (st?.type === 'prompt') this._resolve?.(null);
    this.close();
  }

  /** Open a confirm dialog. Resolves to true when confirmed, false when cancelled/backdrop. */
  public confirm(opts: BaseDialogOptions): Promise<boolean> {
    const v = opts.variant ?? 'neutral';
    const allowBackdropClose = opts.allowBackdropClose ?? v !== 'danger';
    const confirmText = opts.confirmText ?? (v === 'danger' ? 'Delete' : 'OK');
    const cancelText = opts.cancelText ?? 'Cancel';

    this.open({
      type: 'confirm',
      title: opts.title,
      message: opts.message,
      variant: v,
      icon: opts.icon ?? this.defaultIconFor(v),
      allowBackdropClose,
      confirmText,
      cancelText,
    });

    return new Promise<boolean>((resolve) => (this._resolve = resolve));
  }

  /** For the host to know the default icon for a variant */
  public defaultIconFor(variant: DialogVariant): PcIconNameType {
    switch (variant) {
      case 'danger':
        return 'exclamation-triangle';
      case 'warning':
        return 'exclamation-circle';
      case 'info':
        return 'information-circle';
      case 'success':
        return 'check-circle';
      default:
        return 'x-mark';
    }
  }

  /** Host calls these */
  public ok(payload?: unknown): void {
    this._resolve?.(payload ?? true);
    this.close();
  }

  /** Open a prompt dialog. Resolves to string on OK, null on cancel/backdrop. */
  public prompt(opts: PromptOptions): Promise<string | null> {
    this.open({
      type: 'prompt',
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? 'neutral',
      icon: opts.icon ?? ('pencil-square' as PcIconNameType),
      allowBackdropClose: opts.allowBackdropClose ?? true,
      confirmText: opts.confirmText ?? 'OK',
      cancelText: opts.cancelText ?? 'Cancel',
      inputPlaceholder: opts.inputPlaceholder,
      defaultValue: opts.defaultValue,
    });
    return new Promise<string | null>((resolve) => (this._resolve = resolve));
  }

  private close(): void {
    this.isOpen.set(false);
    this.state.set(null);
    this._resolve = null;
  }

  private open(st: DialogState): void {
    this.state.set(st);
    this.isOpen.set(true);
  }
}

export type DialogType = 'confirm' | 'alert' | 'prompt';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'neutral';
