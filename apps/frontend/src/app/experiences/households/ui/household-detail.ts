/**
 * @file Component for creating or editing households and managing their tags and members.
 */
import { Component, OnInit, inject, input, signal, computed } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UpdateHouseholdsType } from '@common';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { AddressAutocomplete } from '@uxcommon/components/address-autocomplete/address-autocomplete';
import { Tags } from '@uxcommon/components/tags/tags';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { HouseholdsService } from '../services/households-service';
import { Households, AddressType } from 'common/src/lib/kysely.models';
import { TagOptionsService } from '@uxcommon/components/datagrid/services/tag-options.service';

/**
 * Component for displaying and managing the details of a household.
 * It supports both creating a new household and editing an existing one.
 */
@Component({
  selector: 'pc-household-detail',
  imports: [FormField, AddressAutocomplete, Tags, AddBtnRow, Icon, RouterModule],
  templateUrl: './household-detail.html',
})
export class HouseholdDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);
  private readonly route = inject(ActivatedRoute);

  /** Whether a background operation is in progress */
  private _loading = createLoadingGate();

  /** Reactive signal for storing the loaded household */
  protected readonly household = signal<Households | null>(null);

  /** Whether the address has been verified via Places API */
  protected addressVerified = false;

  /** List of associated tag strings */
  protected tags: string[] = [];

  /** List of associated issue strings */
  protected issues: string[] = [];

  /** Flat payload backing signal for the form */
  protected readonly payload = signal({
    formatted_address: '',
    type: '',
    lat: 0,
    lng: 0,
    street_num: '',
    street1: '',
    street2: '',
    apt: '',
    city: '',
    state: '',
    country: '',
    zip: '',
    home_phone: '',
    notes: '',
  });

  /** Signal-based form control group */
  protected readonly form = form(this.payload);

  /** Formatted address string computed from the payload */
  protected readonly addressString = computed(() => {
    const raw = this.payload();

    // If formatted_address is present (e.g. populated via Google Places autocomplete)
    if (raw.formatted_address) {
      return raw.formatted_address;
    }

    const parts: string[] = [];

    const streetParts = [
      raw.apt ? `Apt ${raw.apt}` : null,
      raw.street_num,
      raw.street1,
      raw.street2,
    ].filter(Boolean);

    const locationParts = [
      raw.city,
      raw.state,
      raw.zip,
      raw.country,
    ].filter(Boolean);

    if (streetParts.length) {
      parts.push(streetParts.join(' ').trim());
    }
    if (locationParts.length) {
      parts.push(locationParts.join(', ').trim());
    }

    return parts.join(', ').trim();
  });

  /** ID of the household being edited */
  protected id: string | null = null;
  protected isLoading = this._loading.visible;

  /** Component mode: 'edit' or 'new' */
  public mode = input<'new' | 'edit'>('edit');

  /**
   * Handles address selection and parses Google Places data into form.
   * @param address - AddressType object from autocomplete component
   */
  public handleAddressChange(address: AddressType) {
    const end = this._loading.begin();
    try {
      if (!address || !address.street1) {
        this.alertSvc.showError('Please select the correct address from the list or leave it blank');
        return;
      }
      this.payload.update((prev) => ({
        ...prev,
        formatted_address: address.formatted_address ?? '',
        type: address.type ?? '',
        lat: address.lat ?? 0,
        lng: address.lng ?? 0,
        street_num: address.street_num ?? '',
        street1: address.street1 ?? '',
        street2: address.street2 ?? '',
        apt: address.apt ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        country: address.country ?? '',
        zip: address.zip ?? '',
      }));
      this.form.street1().markAsDirty();
      this.addressVerified = true;
    } finally {
      end();
    }
  }

  /**
   * Lifecycle hook that initializes the component.
   */
  public async ngOnInit() {
    if (this.mode() === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
    await this.loadHousehold();
  }

  /**
   * Applies an inline edit made in a grid-like interface to the household.
   * @param input - Object containing the changed field and value
   */
  protected async applyEdit(input: { key: string; value: string; changed: boolean }) {
    if (input.changed) {
      const row = { [input.key]: input.value };
      this.update(row);
    }
  }

  /** Returns the creation date of the household */
  protected getCreatedAt() {
    return this.household()?.created_at;
  }

  /** Returns the last updated date of the household */
  protected getUpdatedAt() {
    return this.household()?.updated_at;
  }

  protected save(done?: () => void) {
    const raw = this.payload();
    const data: UpdateHouseholdsType = {
      home_phone: raw.home_phone,
      street_num: raw.street_num,
      street1: raw.street1,
      street2: raw.street2,
      apt: raw.apt,
      city: raw.city,
      state: raw.state,
      zip: raw.zip,
      country: raw.country,
      notes: raw.notes,
      formatted_address: raw.formatted_address || null,
      type: raw.type || null,
      lat: raw.lat || null,
      lng: raw.lng || null,
    };
    return this.id ? this.update(data, done) : this.add(data, done);
  }

  /**
   * Called when a tag is added in the UI
   * @param tag - The tag to attach to the household
   */
  protected async tagAdded(tag: string) {
    if (!this.id) return;
    try {
      await this.householdsSvc.attachTag(this.id, tag, 'tag');
      await this.tagOptionsSvc.invalidate('tag');
    } catch (err) {
      this.alertSvc.showError(String(err));
    }
  }

  /**
   * Called when a tag is removed in the UI
   * @param tag - The tag to detach from the household
   */
  protected async tagRemoved(tag: string) {
    if (!this.id) return;
    try {
      await this.householdsSvc.detachTag(this.id, tag, 'tag');
      await this.tagOptionsSvc.invalidate('tag');
    } catch (err) {
      this.alertSvc.showError(String(err));
    }
  }

  /**
   * Called when an issue is added in the UI
   * @param issue - The issue to attach to the household
   */
  protected async issueAdded(issue: string) {
    if (!this.id) return;
    try {
      await this.householdsSvc.attachTag(this.id, issue, 'issue');
      await this.tagOptionsSvc.invalidate('issue');
    } catch (err) {
      this.alertSvc.showError(String(err));
    }
  }

  /**
   * Called when an issue is removed in the UI
   * @param issue - The issue to detach from the household
   */
  protected async issueRemoved(issue: string) {
    if (!this.id) return;
    try {
      await this.householdsSvc.detachTag(this.id, issue, 'issue');
      await this.tagOptionsSvc.invalidate('issue');
    } catch (err) {
      this.alertSvc.showError(String(err));
    }
  }

  /**
   * Add a new household using the backend service
   * @param data - The household data to submit
   */
  private add(data: UpdateHouseholdsType, done?: () => void) {
    const end = this._loading.begin();
    this.householdsSvc
      .add(data)
      .then(() => {
        this.alertSvc.showSuccess('Household added');
        this.householdsSvc.triggerRefresh();
        if (done) {
          done();
        }
      })
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }

  /**
   * Loads tags and issues associated with the current household
   */
  private async getTags() {
    if (!this.household || !this.id) {
      return;
    }
    this.tags = await this.householdsSvc.getTags(this.id, 'tag');
    this.issues = await this.householdsSvc.getTags(this.id, 'issue');
  }

  /**
   * Loads the household data from the backend and initializes the form
   */
  private async loadHousehold() {
    if (!this.id) return;

    const end = this._loading.begin();

    try {
      this.household.set((await this.householdsSvc.getById(this.id)) as Households);
      await this.getTags();
      this.refreshForm();
    } finally {
      end();
    }
  }

  /**
   * Populates the form with household data
   */
  private refreshForm() {
    const household = this.household();
    if (!household) return;

    this.payload.set({
      formatted_address: household.formatted_address ?? '',
      type: household.type ?? '',
      lat: household.lat ?? 0,
      lng: household.lng ?? 0,
      street_num: household.street_num ?? '',
      street1: household.street1 ?? '',
      street2: household.street2 ?? '',
      apt: household.apt ?? '',
      city: household.city ?? '',
      state: household.state ?? '',
      country: household.country ?? '',
      zip: household.zip ?? '',
      home_phone: household.home_phone ?? '',
      notes: household.notes ?? '',
    });
    this.form().reset();
  }

  /**
   * Updates an existing household using the backend service
   * @param data - Partial update object for the household
   */
  private update(data: Partial<UpdateHouseholdsType>, done?: () => void) {
    if (!this.id) {
      return;
    }

    const end = this._loading.begin();
    this.householdsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Household updated successfully.');
        this.form().reset();
        this.householdsSvc.triggerRefresh();
        if (done) {
          done();
        }
      })
      .catch((err: unknown) => this.alertSvc.showError(String(err)))
      .finally(() => end());
  }
}
