import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PcDatePipe } from './pc-date.pipe';
import { DateFormatService } from '../services/date-format.service';

describe('PcDatePipe', () => {
  let formatMock: ReturnType<typeof vi.fn>;
  let pipe: PcDatePipe;

  beforeEach(() => {
    formatMock = vi.fn().mockReturnValue('January 15, 2026');
    TestBed.configureTestingModule({
      providers: [{ provide: DateFormatService, useValue: { format: formatMock } }],
    });
    pipe = TestBed.runInInjectionContext(() => new PcDatePipe());
  });

  it('delegates to the tenant date-format service', () => {
    expect(pipe.transform('2026-01-15')).toBe('January 15, 2026');
    expect(formatMock).toHaveBeenCalledWith('2026-01-15', undefined);
  });

  it('forwards an explicit pattern', () => {
    pipe.transform('2026-01-15', 'yyyy-MM-dd');

    expect(formatMock).toHaveBeenCalledWith('2026-01-15', 'yyyy-MM-dd');
  });
});
