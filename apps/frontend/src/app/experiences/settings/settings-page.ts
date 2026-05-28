import { Component, OnInit, effect, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { form, email, pattern, FormField } from '@angular/forms/signals';
import { Icon } from '@icons/icon';
import { SettingsEntryType } from '@common';

import { SettingsService, TenantSettingsSnapshot } from './services/settings-service';
import { SETTINGS_SECTIONS, SettingsFieldConfig, SettingsSectionConfig } from './settings.config';
import { MsSyncSettings } from './ms-sync/ms-sync-settings';
import { BillingSettingsComponent } from './billing/billing-settings';

interface SectionFieldState {
  config: SettingsFieldConfig;
  controlName: string;
}

interface SectionState {
  config: SettingsSectionConfig;
  payload: WritableSignal<Record<string, any>>;
  form: any;
  fields: SectionFieldState[];
}

@Component({
  selector: 'pc-settings-page',
  imports: [FormField, Icon, MsSyncSettings, BillingSettingsComponent],
  templateUrl: './settings-page.html',
})
export class SettingsPage implements OnInit {
  protected readonly settingsSvc = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly snapshotSignal = this.settingsSvc.snapshotSignal;

  protected readonly sections = SETTINGS_SECTIONS;
  protected readonly sectionStates: SectionState[];
  protected readonly selectedSectionId = signal<string>(this.sections[0]?.id ?? '');
  protected readonly savingSectionId = signal<string | null>(null);
  protected readonly hasLoaded = signal(false);

  constructor() {
    this.sectionStates = this.sections.map((section) => this.buildSectionState(section));

    effect(() => {
      const snapshot = this.snapshotSignal();
      this.applySnapshot(snapshot, false);
    });
  }

  public async ngOnInit() {
    await this.settingsSvc.load();
    this.hasLoaded.set(true);
    this.applySnapshot(this.settingsSvc.snapshot(), true);

    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab) {
      this.selectedSectionId.set(tab);
    }
  }

  protected trackSection = (_: number, section: SectionState) => section.config.id;
  protected trackField = (_: number, field: SectionFieldState) => field.controlName;

  protected selectSection(sectionId: string) {
    this.selectedSectionId.set(sectionId);
  }

  protected isSelected(sectionId: string) {
    return this.selectedSectionId() === sectionId;
  }

  protected isSectionDirty(section: SectionState) {
    return section.form().dirty();
  }

  protected isSectionInvalid(section: SectionState) {
    return section.form().invalid();
  }

  protected isSaving(section: SectionState) {
    return this.savingSectionId() === section.config.id;
  }

  protected async saveSection(section: SectionState) {
    if (!section.form().dirty()) return;

    const entries: SettingsEntryType[] = [];
    for (const field of section.fields) {
      const fieldSignal = (section.form as any)[field.controlName]();
      if (!fieldSignal.dirty()) continue;
      const value = this.prepareOutgoingValue(field.config, fieldSignal.value());
      entries.push({ key: field.config.key, value });
    }

    if (!entries.length) {
      section.form().reset();
      return;
    }

    this.savingSectionId.set(section.config.id);
    try {
      const snapshot = await this.settingsSvc.upsert(entries);
      this.applySnapshot(snapshot ?? this.settingsSvc.snapshot(), true, section);
    } finally {
      this.savingSectionId.set(null);
    }
  }

  protected resetSection(section: SectionState) {
    this.applySnapshot(this.settingsSvc.snapshot(), true, section);
  }

  private buildSectionState(section: SettingsSectionConfig): SectionState {
    const initialPayload: Record<string, any> = {};
    const fieldStates: SectionFieldState[] = [];

    for (const field of section.fields) {
      const controlName = this.controlNameFor(field.key);
      initialPayload[controlName] = this.normalizeIncomingValue(field, this.settingsSvc.getValue(field.key, field.defaultValue));
      fieldStates.push({ config: field, controlName });
    }

    const payload = signal(initialPayload);
    const formSignal = form(payload, (p) => {
      for (const field of section.fields) {
        const controlName = this.controlNameFor(field.key);
        if (field.type === 'email') {
          email(p[controlName]);
        }
        if (field.type === 'url') {
          pattern(p[controlName], /^https?:\/\//i);
        }
      }
    });

    return { config: section, payload, form: formSignal, fields: fieldStates };
  }

  private applySnapshot(snapshot: TenantSettingsSnapshot, resetDirty: boolean, target?: SectionState) {
    const sections = target ? [target] : this.sectionStates;

    for (const state of sections) {
      const nextPayload = { ...state.payload() };
      let changed = false;

      for (const field of state.fields) {
        const fieldSignal = (state.form as any)[field.controlName]();
        if (!resetDirty && fieldSignal.dirty()) continue;

        const incoming = this.normalizeIncomingValue(field.config, snapshot[field.config.key]);
        if (nextPayload[field.controlName] !== incoming) {
          nextPayload[field.controlName] = incoming;
          changed = true;
        }
      }

      if (changed) {
        state.payload.set(nextPayload);
      }

      if (resetDirty) {
        state.form().reset();
      }
    }
  }

  private controlNameFor(key: string) {
    return key.replace(/[^a-zA-Z0-9]+/g, '_');
  }

  private normalizeIncomingValue(field: SettingsFieldConfig, raw: unknown) {
    const fallback = field.defaultValue ?? this.defaultForField(field);

    switch (field.type) {
      case 'toggle':
        return Boolean(raw ?? fallback ?? false);
      case 'number': {
        if (raw === null || raw === undefined || raw === '') return fallback ?? null;
        const numeric = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : fallback ?? null;
      }
      case 'select': {
        const options = field.options ?? [];
        const candidate = raw === undefined || raw === null ? fallback : String(raw);
        const match = options.find((option) => option.value === candidate);
        if (match) return match.value;
        return (fallback ?? options[0]?.value ?? '') as string;
      }
      case 'date':
        return typeof raw === 'string' && raw.length ? raw : (fallback as string) ?? '';
      case 'email':
      case 'tel':
      case 'password':
      case 'url':
      case 'text':
        return raw === undefined || raw === null ? (fallback as string) ?? '' : String(raw);
      case 'textarea':
        return raw === undefined || raw === null ? (fallback as string) ?? '' : String(raw);
      default:
        return raw ?? fallback ?? '';
    }
  }

  private defaultForField(field: SettingsFieldConfig) {
    switch (field.type) {
      case 'toggle':
        return false;
      case 'number':
        return null;
      case 'select':
        return field.options?.[0]?.value ?? '';
      default:
        return '';
    }
  }

  private prepareOutgoingValue(field: SettingsFieldConfig, value: unknown) {
    switch (field.type) {
      case 'toggle':
        return Boolean(value);
      case 'number': {
        if (value === '' || value === null || value === undefined) return null;
        const numeric = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      }
      case 'select': {
        const candidate = value === null || value === undefined ? '' : String(value);
        const options = field.options ?? [];
        const match = options.find((option) => option.value === candidate);
        return match ? match.value : this.defaultForField(field);
      }
      case 'date':
        return typeof value === 'string' ? value : value ? String(value) : '';
      case 'textarea':
      case 'text':
      case 'email':
      case 'tel':
      case 'password':
      case 'url':
        return value === null || value === undefined ? '' : String(value);
      default:
        return value ?? '';
    }
  }
}
