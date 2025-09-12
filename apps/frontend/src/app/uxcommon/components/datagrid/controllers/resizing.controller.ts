import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ResizingController {
  private _colStartX = 0;
  private _colStartW = 0;
  private _selStartX = 0;
  private _selStartW = 48;

  beginHeaderResize(
    h: any,
    clientX: number,
    getColWidth: (id: string) => number | null,
    applySize: (col: any, id: string, w: number) => void,
    onDone: () => void,
  ) {
    const col = h?.column;
    if (!col) return;
    const id = String(col.id || '');
    const startW = Number((typeof col.getSize === 'function' ? col.getSize() : undefined) || getColWidth(id) || 100);
    this._colStartX = clientX;
    this._colStartW = startW;
    const move = (e: MouseEvent) => {
      const dx = e.clientX - this._colStartX;
      const w = Math.max(40, Math.floor(this._colStartW + dx));
      applySize(col, id, w);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onDone();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  beginHeaderResizeTouch(
    h: any,
    clientX: number,
    getColWidth: (id: string) => number | null,
    applySize: (col: any, id: string, w: number) => void,
    onDone: () => void,
  ) {
    const col = h?.column;
    if (!col) return;
    const id = String(col.id || '');
    const startW = Number((typeof col.getSize === 'function' ? col.getSize() : undefined) || getColWidth(id) || 100);
    this._colStartX = clientX;
    this._colStartW = startW;
    const move = (e: TouchEvent) => {
      const dx = (e.touches?.[0]?.clientX ?? 0) - this._colStartX;
      const w = Math.max(40, Math.floor(this._colStartW + dx));
      applySize(col, id, w);
    };
    const up = () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      onDone();
    };
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
  }

  beginSelectionResize(clientX: number, startWidth: number, setWidth: (w: number) => void, onDone: () => void) {
    this._selStartX = clientX;
    this._selStartW = startWidth;
    const move = (e: MouseEvent) => {
      const dx = e.clientX - this._selStartX;
      const w = Math.max(32, this._selStartW + dx);
      setWidth(Math.round(w));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onDone();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  beginSelectionResizeTouch(clientX: number, startWidth: number, setWidth: (w: number) => void, onDone: () => void) {
    this._selStartX = clientX;
    this._selStartW = startWidth;
    const move = (e: TouchEvent) => {
      const dx = (e.touches?.[0]?.clientX ?? 0) - this._selStartX;
      const w = Math.max(32, this._selStartW + dx);
      setWidth(Math.round(w));
    };
    const up = () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      onDone();
    };
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
  }
}

