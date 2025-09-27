import { Injectable, inject } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';

@Injectable({ providedIn: 'root' })
export class TagOptionsService {
  private readonly tagsSvc = inject(TagsService);
  private cache: string[] | null = null;
  private pending: Promise<string[]> | null = null;

  async getTagNames(): Promise<string[]> {
    if (this.cache) return this.cache;
    if (this.pending) return this.pending;

    this.pending = this.fetchTagNames()
      .then((names) => {
        this.cache = names;
        this.pending = null;
        return names;
      })
      .catch((err) => {
        this.pending = null;
        throw err;
      });

    return this.pending;
  }

  private async fetchTagNames(): Promise<string[]> {
    try {
      const { rows } = await this.tagsSvc.getAll({ limit: 1000, offset: 0, orderBy: ['name'] });
      const names = Array.isArray(rows)
        ? rows
            .map((row: any) => (row?.name != null ? String(row.name).trim() : ''))
            .filter((name: string): name is string => name.length > 0)
        : [];
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const name of names) {
        if (seen.has(name)) continue;
        seen.add(name);
        unique.push(name);
      }
      unique.sort((a, b) => a.localeCompare(b));
      return unique;
    } catch {
      return [];
    }
  }
}
