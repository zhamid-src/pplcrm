import { Injectable, inject } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';
import { TagPaletteService } from '@experiences/tags/ui/tag-palette.service';

@Injectable({ providedIn: 'root' })
export class TagOptionsService {
  private readonly tagsSvc = inject(TagsService);
  private readonly tagPaletteSvc = inject(TagPaletteService);

  public readonly tagNames: string[] = [];
  public readonly issueNames: string[] = [];

  private tagPending: Promise<string[]> | null = null;
  private issuePending: Promise<string[]> | null = null;

  async invalidate(type?: 'tag' | 'issue'): Promise<void> {
    if (!type || type === 'tag') {
      this.tagPending = null;
      await this.load('tag');
    }
    if (!type || type === 'issue') {
      this.issuePending = null;
      await this.load('issue');
    }
  }

  async getTagNames(type: 'tag' | 'issue' = 'tag'): Promise<string[]> {
    const live = type === 'issue' ? this.issueNames : this.tagNames;
    if (live.length > 0) return live;
    await this.load(type);
    return live;
  }

  private async load(type: 'tag' | 'issue'): Promise<void> {
    const isPending = type === 'issue' ? this.issuePending : this.tagPending;
    if (isPending) {
      await isPending;
      return;
    }

    const live = type === 'issue' ? this.issueNames : this.tagNames;

    const promise = this.fetchTagNames(type)
      .then((names) => {
        // Mutate in-place so all external references stay valid
        live.splice(0, live.length, ...names);
        if (type === 'issue') this.issuePending = null;
        else this.tagPending = null;
        void this.tagPaletteSvc.ensurePalette();
        return names;
      })
      .catch(() => {
        if (type === 'issue') this.issuePending = null;
        else this.tagPending = null;
        return [] as string[];
      });

    if (type === 'issue') this.issuePending = promise;
    else this.tagPending = promise;

    await promise;
  }

  private async fetchTagNames(type: 'tag' | 'issue' = 'tag'): Promise<string[]> {
    try {
      const { rows } = await this.tagsSvc.getAll({ limit: 1000, offset: 0, orderBy: ['name'], type });
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
