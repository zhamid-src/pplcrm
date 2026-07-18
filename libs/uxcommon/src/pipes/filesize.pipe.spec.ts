import { describe, it, expect } from 'vitest';
import { FileSizePipe } from './filesize.pipe';

describe('FileSizePipe', () => {
  const pipe = new FileSizePipe();

  it.each([
    [0, '0 Bytes'],
    [1, '1 Bytes'],
    [1023, '1023 Bytes'], // stays in bytes until a full KB
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [1073741824, '1 GB'],
    [5368709120, '5 GB'],
  ])('%i bytes → %s', (bytes, expected) => {
    expect(pipe.transform(bytes)).toBe(expected);
  });

  it('respects the decimals argument and clamps negatives to zero', () => {
    expect(pipe.transform(1536, 0)).toBe('2 KB'); // 1.5 rounds up
    expect(pipe.transform(1234567, 1)).toBe('1.2 MB');
    expect(pipe.transform(1536, -3)).toBe('2 KB'); // negative decimals treated as 0
  });

  it('drops trailing zeros from the rounded value', () => {
    expect(pipe.transform(1024, 2)).toBe('1 KB'); // not "1.00 KB"
  });
});
