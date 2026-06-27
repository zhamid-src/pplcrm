import { inject, Pipe, PipeTransform } from '@angular/core';

import { DateFormatService } from '../services/date-format.service';

/**
 * Formats a date using the tenant's configured Appearance → Date Format setting.
 * Impure so it reflects setting changes (via the settings snapshot signal) without a reload.
 */
@Pipe({
  name: 'pcDate',
  standalone: true,
  pure: false,
})
export class PcDatePipe implements PipeTransform {
  private readonly dates = inject(DateFormatService);

  public transform(value: string | number | Date | null | undefined, pattern?: string): string {
    return this.dates.format(value, pattern);
  }
}
