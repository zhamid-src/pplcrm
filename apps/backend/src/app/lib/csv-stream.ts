import { Transform } from 'stream';

import { escapeCsvCell } from './csv';

export class CsvTransformStream extends Transform {
  private isFirst = true;
  private columns: string[];
  public rowCount = 0;

  constructor(columns: string[] = []) {
    super({ objectMode: true });
    this.columns = columns;
  }

  override _transform(
    row: Record<string, unknown>,
    _encoding: string,
    callback: (err?: Error | null, chunk?: unknown) => void,
  ) {
    this.rowCount++;
    let chunk = '';

    if (this.isFirst) {
      if (!this.columns || this.columns.length === 0) {
        this.columns = Object.keys(row);
      }
      chunk += this.columns.join(',') + '\n';
      this.isFirst = false;
    }

    chunk += this.columns.map((col) => escapeCsvCell(row[col])).join(',') + '\n';
    callback(null, chunk);
  }

  override _flush(callback: (err?: Error | null) => void) {
    callback();
  }
}
