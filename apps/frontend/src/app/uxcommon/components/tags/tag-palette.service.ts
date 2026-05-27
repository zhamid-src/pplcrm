import { Service, inject, resource, computed } from '@angular/core';
import { TagsService } from '@experiences/tags/services/tags-service';

interface PaletteMap {
  [name: string]: string | null;
}

@Service()
export class TagPaletteService {
  private readonly tagsSvc = inject(TagsService);

  // Use Angular 22 resource to declaratively load tags
  private readonly tagsResource = resource({
    params: () => (typeof this.tagsSvc?.refreshCount === 'function' ? this.tagsSvc.refreshCount() : 0),
    loader: async () => {
      try {
        if (typeof this.tagsSvc?.getAll === 'function') {
          const res = await this.tagsSvc.getAll({ limit: 1000 });
          return res?.rows || [];
        }
      } catch (err) {
        // Best-effort cache; swallow errors to avoid breaking tag rendering in specs/runtime.
      }
      return [];
    },
  });

  // Dynamically compute the palette map when the resource loads
  private readonly paletteSignal = computed(() => {
    const rows = this.tagsResource.value() || [];
    const map: PaletteMap = {};
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
    return map;
  });

  public palette() {
    return this.paletteSignal();
  }

  public colorFor(name: string | null | undefined): string | null {
    if (!name) return null;
    const palette = this.paletteSignal();
    const direct = palette[name];
    const lookup = direct ?? palette[name.toLowerCase?.() ?? ''];
    return lookup ?? null;
  }

  public async ensurePalette(): Promise<void> {
    // Trigger a reload of the resource
    this.tagsResource.reload();
  }
}
