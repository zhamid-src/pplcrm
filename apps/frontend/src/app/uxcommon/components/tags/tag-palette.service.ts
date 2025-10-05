import { Injectable, inject, signal } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';

interface PaletteMap {
  [name: string]: string | null;
}

@Injectable({ providedIn: 'root' })
export class TagPaletteService {
  private readonly tagsSvc = inject(TagsService);
  private readonly paletteSignal = signal<PaletteMap>({});
  private loading = false;
  private loadedOnce = false;

  constructor() {
    void this.ensurePalette();
  }

  public palette() {
    return this.paletteSignal();
  }

  public colorFor(name: string | null | undefined): string | null {
    if (!name) return null;
    const palette = this.paletteSignal();
    const direct = palette[name];
    const lookup = direct ?? palette[name.toLowerCase?.() ?? ''];
    if (!this.loadedOnce && !this.loading) void this.ensurePalette();
    return lookup ?? null;
  }

  public async ensurePalette(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const { rows } = await this.tagsSvc.getAll({ limit: 1000 });
      const map: PaletteMap = {};
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const rawName = (row as { name?: unknown })?.name;
          if (typeof rawName !== 'string') continue;
          const name = rawName.trim();
          if (!name) continue;
          const rawColor = (row as { color?: unknown })?.color;
          const normalizedColor =
            typeof rawColor === 'string' && rawColor.trim().length > 0 ? rawColor.trim() : null;
          map[name] = normalizedColor;
          map[name.toLowerCase()] ??= normalizedColor;
        }
      }
      this.paletteSignal.set(map);
      this.loadedOnce = true;
    } catch {
      // Best-effort cache; swallow errors to avoid breaking tag rendering.
    } finally {
      this.loading = false;
    }
  }
}
