import { Component, computed, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Icon } from '@uxcommon/components/icons/icon';
import { RELATION_TYPE_LABELS } from '../../../../../../../libs/common/src';

type ConnectionRow = {
  id: string;
  from_person_id: string;
  to_person_id: string;
  relation_type: string;
  custom_label: string | null;
  is_mutual: boolean;
  notes: string | null;
  from_first_name: string | null;
  from_last_name: string | null;
  to_first_name: string | null;
  to_last_name: string | null;
  created_at: Date | string;
};

const BADGE_CLASSES: Record<string, string> = {
  referred_by: 'badge-secondary',
  referred_to: 'badge-secondary',
  close_friend: 'badge-success',
  family_member: 'badge-primary',
  spouse: 'badge-primary',
  colleague: 'badge-neutral',
  org_affiliation: 'badge-warning',
  introduced_by: 'badge-info',
  introduced_to: 'badge-info',
  custom: 'badge-ghost',
};

@Component({
  selector: 'pc-connection-card',
  imports: [RouterModule, Icon],
  template: `
    <div class="flex items-center gap-3 p-3 rounded-xl border border-base-200 hover:bg-base-50 transition-colors group">
      <!-- Avatar -->
      <div class="avatar placeholder shrink-0">
        <div class="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
          <span class="text-sm font-bold">{{ initials() }}</span>
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <a
          [routerLink]="['/people', otherPerson().id]"
          class="font-semibold text-sm hover:text-primary transition-colors block truncate"
        >
          {{ otherPerson().first_name }} {{ otherPerson().last_name }}
        </a>
        <div class="flex items-center gap-2 mt-0.5 flex-wrap">
          <span class="text-xs font-mono text-base-content/50">{{ directionLabel() }}</span>
          <span class="badge badge-sm {{ badgeClass() }}">{{ relationLabel() }}</span>
          @if (connection().notes) {
            <span class="text-xs text-base-content/40 truncate max-w-[140px]">{{ connection().notes }}</span>
          }
        </div>
      </div>

      <!-- Remove -->
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-circle text-error/50 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
        (click)="remove.emit(connection().id)"
        data-tip="Remove connection"
      >
        <pc-icon name="x-mark" [size]="3"></pc-icon>
      </button>
    </div>
  `,
})
export class ConnectionCard {
  readonly connection = input.required<ConnectionRow>();
  readonly currentPersonId = input.required<string>();
  readonly remove = output<string>();

  protected readonly otherPerson = computed(() => {
    const c = this.connection();
    const isFrom = String(c.from_person_id) === String(this.currentPersonId());
    return {
      id: isFrom ? String(c.to_person_id) : String(c.from_person_id),
      first_name: isFrom ? c.to_first_name : c.from_first_name,
      last_name: isFrom ? c.to_last_name : c.from_last_name,
    };
  });

  protected readonly directionLabel = computed(() => {
    const c = this.connection();
    if (c.is_mutual) return '↔';
    return String(c.from_person_id) === String(this.currentPersonId()) ? '→' : '←';
  });

  protected readonly initials = computed(() => {
    const p = this.otherPerson();
    return `${(p.first_name ?? '').charAt(0)}${(p.last_name ?? '').charAt(0)}`.toUpperCase() || '?';
  });

  protected readonly badgeClass = computed(() => BADGE_CLASSES[this.connection().relation_type] ?? 'badge-ghost');

  protected readonly relationLabel = computed(() => {
    const c = this.connection();
    if (c.relation_type === 'custom' && c.custom_label) return c.custom_label;
    return RELATION_TYPE_LABELS[c.relation_type as keyof typeof RELATION_TYPE_LABELS] ?? c.relation_type;
  });
}
