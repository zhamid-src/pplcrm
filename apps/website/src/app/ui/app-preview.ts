import { Component, computed, input } from '@angular/core';

import { SiteIcon } from './site-icon';

export type PreviewKind = 'inbox' | 'canvassing' | 'donations';

type ChipTone = 'primary' | 'success' | 'info' | 'warning' | 'neutral';

interface PreviewRow {
  readonly name: string;
  readonly sub: string;
  readonly chip: string;
  readonly tone: ChipTone;
  readonly meta: string;
}

interface PreviewModel {
  readonly title: string;
  readonly active: string;
  readonly rows: readonly PreviewRow[];
}

const CHIP_CLASS: Record<ChipTone, string> = {
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/20 text-success-content',
  info: 'bg-info/15 text-[#0e4e6e]',
  warning: 'bg-warning/40 text-warning-content',
  neutral: 'bg-base-300/60 text-base-content/60',
};

const MODELS: Record<PreviewKind, PreviewModel> = {
  inbox: {
    title: 'Shared inbox',
    active: 'inbox',
    rows: [
      {
        name: 'Pothole on Alder St',
        sub: 'Elena Ramos · assigned to Zee',
        chip: 'In progress',
        tone: 'primary',
        meta: 'Due Fri',
      },
      {
        name: 'Noise complaint follow-up',
        sub: 'Wei Chen · assigned to Amara',
        chip: 'Waiting',
        tone: 'warning',
        meta: 'Due Mon',
      },
      { name: 'Permit question', sub: 'Denise Cole · unassigned', chip: 'New', tone: 'info', meta: 'Today' },
      {
        name: 'Park cleanup thank-you',
        sub: 'Priya Natarajan · assigned to Zee',
        chip: 'Done',
        tone: 'success',
        meta: 'Yesterday',
      },
      {
        name: 'Transit petition reply',
        sub: 'Marcus Lee · assigned to Amara',
        chip: 'In progress',
        tone: 'primary',
        meta: 'Due Wed',
      },
    ],
  },
  canvassing: {
    title: 'Canvassing',
    active: 'map-pin',
    rows: [
      { name: 'Turf 12 · Maple Heights', sub: '14 doors · 21 voters', chip: 'Supporter', tone: 'success', meta: '43%' },
      { name: 'Turf 08 · Riverside', sub: '18 doors · 27 voters', chip: 'Mixed', tone: 'info', meta: '61%' },
      { name: 'Turf 15 · Old Town', sub: '11 doors · 16 voters', chip: 'Not home', tone: 'warning', meta: '28%' },
      { name: 'Turf 04 · Elmwood', sub: '22 doors · 33 voters', chip: 'Supporter', tone: 'success', meta: '77%' },
      { name: 'Turf 21 · The Flats', sub: '9 doors · 12 voters', chip: 'Remaining', tone: 'neutral', meta: '0%' },
    ],
  },
  donations: {
    title: 'Donations',
    active: 'currency-dollar',
    rows: [
      { name: 'Elena Ramos', sub: 'One-time gift · card', chip: 'Thanked', tone: 'success', meta: '$250' },
      { name: 'Wei Chen', sub: 'Monthly · since Mar', chip: 'Recurring', tone: 'primary', meta: '$40' },
      { name: 'Denise Cole', sub: 'Pledged at door', chip: 'Pledge', tone: 'warning', meta: '$100' },
      { name: 'Priya Natarajan', sub: 'One-time gift · cheque', chip: 'Thanked', tone: 'success', meta: '$500' },
      { name: 'Marcus Lee', sub: 'One-time gift · card', chip: 'New', tone: 'info', meta: '$75' },
    ],
  },
};

/**
 * A stylised mock of the CRM shown inside the hero's browser frame — a left
 * icon rail plus a list view that changes with the selected audience. It is
 * pure markup (no screenshot asset); swap in a real screenshot via
 * <pc-browser-frame imageSrc="..."> whenever you have one.
 */
@Component({
  selector: 'pc-app-preview',
  imports: [SiteIcon],
  template: `
    <div class="flex text-left">
      <!-- Icon rail -->
      <div class="hidden flex-col items-center gap-1 border-r border-line bg-base-200 px-2 py-3 sm:flex">
        @for (icon of rail; track icon) {
          <span
            class="grid h-8 w-8 place-items-center rounded-lg"
            [class]="icon === model().active ? 'bg-primary/12 text-primary' : 'text-base-content/40'"
          >
            <pc-site-icon [name]="icon" [size]="18" />
          </span>
        }
      </div>

      <!-- Main -->
      <div class="min-w-0 flex-1 p-3.5 sm:p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">{{ model().title }}</div>
          <span class="rounded-field bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-content">+ New</span>
        </div>

        <div class="mt-2.5 flex gap-1.5">
          <span class="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-white">All</span>
          <span class="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold text-base-content/60"
            >Mine</span
          >
          <span class="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold text-base-content/60"
            >Open</span
          >
        </div>

        <div class="mt-2.5 flex flex-col gap-1.5">
          @for (row of model().rows; track row.name) {
            <div class="flex items-center gap-3 rounded-lg border border-line bg-base-100 px-3 py-2.5">
              <span
                class="grid h-7 w-7 flex-none place-items-center rounded-full bg-base-200 text-[11px] font-semibold text-base-content/60"
              >
                {{ initials(row.name) }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[12.5px] font-semibold">{{ row.name }}</div>
                <div class="truncate text-[10.5px] text-base-content/50">{{ row.sub }}</div>
              </div>
              <span
                class="flex-none rounded-full px-2 py-0.5 text-[9.5px] font-semibold"
                [class]="chipClass(row.tone)"
                >{{ row.chip }}</span
              >
              <span
                class="hidden w-10 flex-none text-right text-[11px] font-medium tabular-nums text-base-content/60 sm:block"
                >{{ row.meta }}</span
              >
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AppPreview {
  public readonly kind = input<PreviewKind>('inbox');

  protected readonly rail = ['inbox', 'users', 'megaphone', 'map-pin', 'currency-dollar'] as const;
  protected readonly model = computed<PreviewModel>(() => MODELS[this.kind()]);

  protected chipClass(tone: ChipTone): string {
    return CHIP_CLASS[tone];
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase();
  }
}
