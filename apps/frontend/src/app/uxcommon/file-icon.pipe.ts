// file-icon.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

import { ICON_FOR_KEY, iconKeyForFilename } from './file-icon.util';

@Pipe({
  name: 'fileIcon',
  standalone: true,
})
export class FileIconPipe implements PipeTransform {
  public transform(filename: string | null | undefined): string {
    const key = iconKeyForFilename(filename ?? '');
    return ICON_FOR_KEY[key] ?? ICON_FOR_KEY.unknown;
  }
}
