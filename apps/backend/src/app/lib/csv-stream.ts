import { Transform } from 'stream';

export class CsvTransformStream extends Transform {
  private isFirst = true;
  private columns: string[];
  public rowCount = 0;

  constructor(columns: string[] = []) {
    super({ objectMode: true });
    this.columns = columns;
  }

  override _transform(row: any, _encoding: string, callback: (err?: Error | null, chunk?: any) => void) {
    this.rowCount++;
    let chunk = '';

    if (this.isFirst) {
      if (!this.columns || this.columns.length === 0) {
        this.columns = Object.keys(row);
      }
      chunk += this.columns.join(',') + '\n';
      this.isFirst = false;
    }

    const escape = (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString();
      const str = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? '"' + str.replace(/"/g, '""') + '"'
        : str;
    };

    chunk += this.columns.map((col) => escape(row[col])).join(',') + '\n';
    callback(null, chunk);
  }

  override _flush(callback: (err?: Error | null) => void) {
    callback();
  }
}
