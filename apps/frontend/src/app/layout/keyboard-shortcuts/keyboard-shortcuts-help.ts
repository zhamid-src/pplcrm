import { Component, inject } from '@angular/core';
import { Icon } from '@icons/icon';

import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';

/**
 * Modal overlay listing every global keyboard shortcut. Visibility is driven by
 * {@link KeyboardShortcutsService.helpVisible}; opened with `?` from anywhere.
 */
@Component({
  selector: 'pc-keyboard-shortcuts-help',
  imports: [Icon],
  templateUrl: './keyboard-shortcuts-help.html',
})
export class KeyboardShortcutsHelp {
  protected readonly shortcuts = inject(KeyboardShortcutsService);

  protected close(): void {
    this.shortcuts.closeHelp();
  }
}
