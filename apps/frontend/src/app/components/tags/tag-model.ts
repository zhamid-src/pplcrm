import { signal } from '@angular/core';

export class TagModel {
  constructor(
    public name: string,
    public invisible = signal(false),
  ) {}
}
