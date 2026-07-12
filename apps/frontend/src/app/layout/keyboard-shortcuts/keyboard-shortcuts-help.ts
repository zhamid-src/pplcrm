import { Component, inject } from '@angular/core';
import { ModalShell } from '@uxcommon/components/modal-shell/modal-shell';

import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';

/**
 * Modal overlay listing every global keyboard shortcut. Visibility is driven by
 * {@link KeyboardShortcutsService.helpVisible}; opened with `?` from anywhere.
 */
@Component({
  selector: 'pc-keyboard-shortcuts-help',
  imports: [ModalShell],
  templateUrl: './keyboard-shortcuts-help.html',
})
export class KeyboardShortcutsHelp {
  protected readonly shortcuts = inject(KeyboardShortcutsService);

  protected close(): void {
    this.shortcuts.closeHelp();
  }
}
