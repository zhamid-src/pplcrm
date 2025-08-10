import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ICONS, IconName } from './icons.index';

@Injectable({ providedIn: 'root' })
export class IconService {
  private cache = new Map<IconName, string>();

  constructor(private http: HttpClient) {}

  public async getIcon(name: IconName): Promise<string> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }
    const svg = await this.http.get(ICONS[name], { responseType: 'text' }).toPromise();

    if (!svg) return '';
    this.cache.set(name, svg);
    return svg;
  }
}
