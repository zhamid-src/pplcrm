import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { PersonsService } from '../services/persons-service';
import { HouseholdsService } from '../../households/services/households-service';
import { CompaniesService } from '../../companies/services/companies-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { Router } from '@angular/router';
import { PcIconNameType } from '@icons/icons.index';

interface DuplicateGroup {
  reason: string;
  persons?: any[];
  households?: any[];
  companies?: any[];
  selectedTargetId?: string;
  selectedSourceId?: string;
}

@Component({
  selector: 'pc-duplicate-manager',
  imports: [DatePipe, LowerCasePipe, Icon],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Selection Screen -->
      @if (selectedMode() === 'select') {
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-10 mt-6">
            <h1 class="text-3xl font-bold tracking-tight text-base-content mb-2 flex items-center justify-center gap-2">
              <pc-icon name="document-duplicate" class="text-primary" [size]="8"></pc-icon>
              Manage Duplicates
            </h1>
            <p class="text-base text-base-content/60 max-w-xl mx-auto">
              Select which records you want to scan for potential duplicates and merge to clean up your database.
            </p>
          </div>

          <div class="grid gap-6">
            <!-- People Card -->
            <div
              (click)="setMode('people')"
              class="card bg-base-100 border border-base-300 shadow hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer group p-5 flex flex-row items-center justify-between gap-6"
            >
              <div class="flex items-center gap-5 flex-1">
                <div
                  class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                >
                  <pc-icon name="identification" [size]="6"></pc-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-base-content mb-1 group-hover:text-primary transition-colors">
                    People
                  </h3>
                  <p class="text-sm text-base-content/60 font-light">
                    Review and merge duplicate contacts sharing the same email or name at the same address.
                  </p>
                </div>
              </div>
              <div class="text-base-content/30 group-hover:text-primary transition-colors pr-2">
                <pc-icon name="chevron-right" [size]="5"></pc-icon>
              </div>
            </div>

            <!-- Households Card -->
            <div
              (click)="setMode('households')"
              class="card bg-base-100 border border-base-300 shadow hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer group p-5 flex flex-row items-center justify-between gap-6"
            >
              <div class="flex items-center gap-5 flex-1">
                <div
                  class="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                >
                  <pc-icon name="house-modern" [size]="6"></pc-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-base-content mb-1 group-hover:text-secondary transition-colors">
                    Households
                  </h3>
                  <p class="text-sm text-base-content/60 font-light">
                    Review and merge duplicate household records sharing the exact same address fingerprint.
                  </p>
                </div>
              </div>
              <div class="text-base-content/30 group-hover:text-secondary transition-colors pr-2">
                <pc-icon name="chevron-right" [size]="5"></pc-icon>
              </div>
            </div>

            <!-- Companies Card -->
            <div
              (click)="setMode('companies')"
              class="card bg-base-100 border border-base-300 shadow hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer group p-5 flex flex-row items-center justify-between gap-6"
            >
              <div class="flex items-center gap-5 flex-1">
                <div
                  class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                >
                  <pc-icon name="briefcase" [size]="6"></pc-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-base-content mb-1 group-hover:text-accent transition-colors">
                    Companies
                  </h3>
                  <p class="text-sm text-base-content/60 font-light">
                    Review and merge duplicate company records sharing the same name.
                  </p>
                </div>
              </div>
              <div class="text-base-content/30 group-hover:text-accent transition-colors pr-2">
                <pc-icon name="chevron-right" [size]="5"></pc-icon>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Duplicate Management Feed -->
      @if (selectedMode() !== 'select') {
        <div>
          <!-- Back to Option Selection -->
          <div class="mb-4">
            <button
              class="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-base-content px-0"
              (click)="setMode('select')"
            >
              <pc-icon name="arrow-left" [size]="4"></pc-icon>
              Back to Duplicate Types
            </button>
          </div>

          <!-- Header -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
                <pc-icon [name]="getModeIcon()" class="text-primary" [size]="7"></pc-icon>
                Manage Duplicate {{ getModeTitle() }}
              </h1>
              <p class="text-sm text-base-content/60 mt-1">
                {{ getModeDescription() }}
              </p>
            </div>
          </div>

          <!-- Loading State -->
          @if (isLoading()) {
            <div class="flex flex-col items-center justify-center py-20">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="text-base-content/60 mt-4 font-light">
                Scanning database for potential duplicate {{ getModeTitle() | lowercase }}...
              </p>
            </div>
          }

          <!-- Empty State -->
          @if (!isLoading() && groups().length === 0) {
            <div class="card bg-base-100 border border-base-300 shadow-xl max-w-xl mx-auto mt-10">
              <div class="card-body items-center text-center py-16">
                <div class="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mb-4 animate-bounce">
                  <pc-icon name="check-circle" class="text-success" [size]="10"></pc-icon>
                </div>
                <h2 class="card-title text-xl font-bold text-success">Clean Database!</h2>
                <p class="text-base-content/60 mt-2">
                  Awesome! No potential duplicate {{ getModeTitle() | lowercase }} were found.
                </p>
                <div class="card-actions mt-6">
                  <button class="btn btn-primary" (click)="routeToBackList()">Go to {{ getModeTitle() }}</button>
                </div>
              </div>
            </div>
          }

          <!-- Duplicate Groups Feed -->
          @if (!isLoading() && groups().length > 0) {
            <div class="grid gap-6">
              @for (group of groups(); track group; let gIdx = $index) {
                <div
                  class="card bg-base-100 border border-base-300 shadow-xl overflow-hidden hover:border-primary/30 transition-all duration-200"
                >
                  <!-- Group Title -->
                  <div class="bg-base-200/50 px-6 py-4 border-b border-base-300 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                      <span class="badge badge-warning badge-sm">Warning</span>
                      <h3 class="font-bold text-base-content">{{ group.reason }}</h3>
                    </div>
                    <span class="text-xs text-base-content/50">{{ getItemsCount(group) }} matching records</span>
                  </div>

                  <!-- Group Details -->
                  <div class="card-body p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <!-- Select Primary & Duplicate Cards (People Mode) -->
                      @if (selectedMode() === 'people') {
                        @for (person of group.persons; track person.id) {
                          <div
                            [class]="
                              'card bg-base-200/40 border transition-all duration-200 ' +
                              (group.selectedTargetId === person.id
                                ? 'border-success bg-success/5 shadow'
                                : group.selectedSourceId === person.id
                                  ? 'border-error bg-error/5 opacity-80'
                                  : 'border-base-300')
                            "
                          >
                            <div class="card-body p-4 justify-between h-full">
                              <div>
                                <h4 class="font-bold text-lg text-base-content flex justify-between items-center">
                                  <span>{{ person.first_name }} {{ person.last_name }}</span>
                                  <span class="text-xs font-light text-base-content/40">ID: {{ person.id }}</span>
                                </h4>

                                <div class="mt-3 space-y-1.5 text-sm">
                                  <div class="flex items-center gap-2 text-base-content/70">
                                    <pc-icon name="envelope" [size]="4" class="opacity-50"></pc-icon>
                                    <span class="truncate" [title]="person.email || 'No email'">{{
                                      person.email || '—'
                                    }}</span>
                                  </div>
                                  <div class="flex items-center gap-2 text-base-content/70">
                                    <pc-icon name="identification" [size]="4" class="opacity-50"></pc-icon>
                                    <span>{{ person.mobile || '—' }}</span>
                                  </div>
                                  <div class="flex items-center gap-2 text-base-content/70">
                                    <pc-icon name="home" [size]="4" class="opacity-50"></pc-icon>
                                    <span>{{ person.home_phone || '—' }}</span>
                                  </div>
                                  <div class="text-[11px] text-base-content/40 mt-2">
                                    Created: {{ person.created_at | date: 'short' }}
                                  </div>
                                </div>
                              </div>

                              <div class="flex gap-2 mt-4 pt-3 border-t border-base-300">
                                <button
                                  [class]="
                                    'btn btn-xs flex-1 ' +
                                    (group.selectedTargetId === person.id ? 'btn-success' : 'btn-outline')
                                  "
                                  (click)="selectRole(gIdx, person.id, 'target')"
                                >
                                  Keep (Primary)
                                </button>
                                <button
                                  [class]="
                                    'btn btn-xs flex-1 ' +
                                    (group.selectedSourceId === person.id ? 'btn-error' : 'btn-outline')
                                  "
                                  (click)="selectRole(gIdx, person.id, 'source')"
                                >
                                  Delete (Merge)
                                </button>
                              </div>
                            </div>
                          </div>
                        }
                      }

                      <!-- Select Primary & Duplicate Cards (Households Mode) -->
                      @if (selectedMode() === 'households') {
                        @for (hh of group.households; track hh.id) {
                          <div
                            [class]="
                              'card bg-base-200/40 border transition-all duration-200 ' +
                              (group.selectedTargetId === hh.id
                                ? 'border-success bg-success/5 shadow'
                                : group.selectedSourceId === hh.id
                                  ? 'border-error bg-error/5 opacity-80'
                                  : 'border-base-300')
                            "
                          >
                            <div class="card-body p-4 justify-between h-full">
                              <div>
                                <h4 class="font-bold text-lg text-base-content flex justify-between items-center">
                                  <span>{{ getFullAddress(hh) }}</span>
                                  <span class="text-xs font-light text-base-content/40">ID: {{ hh.id }}</span>
                                </h4>

                                <div class="mt-3 space-y-2 text-sm">
                                  <div class="flex items-center gap-2 text-base-content/70">
                                    <pc-icon name="home" [size]="4" class="opacity-50"></pc-icon>
                                    <span>{{ hh.home_phone || '—' }}</span>
                                  </div>
                                  @if (hh.notes) {
                                    <div
                                      class="text-xs text-base-content/70 bg-base-300/30 p-1.5 rounded border border-base-300/40 italic"
                                    >
                                      "{{ hh.notes }}"
                                    </div>
                                  }
                                  <div class="text-[11px] text-base-content/40">
                                    Created: {{ hh.created_at | date: 'short' }}
                                  </div>

                                  <!-- Household Members list -->
                                  <div class="mt-3 pt-3 border-t border-base-300/50">
                                    <div class="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-1">
                                      Members ({{ hh.persons?.length || 0 }}):
                                    </div>
                                    @if (!hh.persons?.length) {
                                      <div class="text-xs text-base-content/40 italic">No members in household</div>
                                    }
                                    <ul class="list-disc pl-4 space-y-1">
                                      @for (member of hh.persons; track member.id) {
                                        <li class="text-xs text-base-content/85">
                                          <span class="font-medium"
                                            >{{ member.first_name }} {{ member.last_name }}</span
                                          >
                                          @if (member.email) {
                                            <span class="text-[10px] text-base-content/50 font-light truncate ml-1"
                                              >({{ member.email }})</span
                                            >
                                          }
                                        </li>
                                      }
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              <div class="flex gap-2 mt-4 pt-3 border-t border-base-300">
                                <button
                                  [class]="
                                    'btn btn-xs flex-1 ' +
                                    (group.selectedTargetId === hh.id ? 'btn-success' : 'btn-outline')
                                  "
                                  (click)="selectRole(gIdx, hh.id, 'target')"
                                >
                                  Keep (Primary)
                                </button>
                                <button
                                  [class]="
                                    'btn btn-xs flex-1 ' +
                                    (group.selectedSourceId === hh.id ? 'btn-error' : 'btn-outline')
                                  "
                                  (click)="selectRole(gIdx, hh.id, 'source')"
                                >
                                  Delete (Merge)
                                </button>
                              </div>
                            </div>
                          </div>
                        }
                      }

                      <!-- Select Primary & Duplicate Cards (Companies Mode) -->
                      @if (selectedMode() === 'companies') {
                        @for (company of group.companies; track company.id) {
                          <div
                            [class]="
                              'card bg-base-200/40 border transition-all duration-200 ' +
                              (group.selectedTargetId === company.id
                                ? 'border-success bg-success/5 shadow'
                                : group.selectedSourceId === company.id
                                  ? 'border-error bg-error/5 opacity-80'
                                  : 'border-base-300')
                            "
                          >
                            <div class="card-body p-4 justify-between h-full">
                              <div>
                                <h4 class="font-bold text-lg text-base-content flex justify-between items-center">
                                  <span>{{ company.name }}</span>
                                  <span class="text-xs font-light text-base-content/40">ID: {{ company.id }}</span>
                                </h4>

                                <div class="mt-3 space-y-2 text-sm">
                                  @if (company.website) {
                                    <div class="flex items-center gap-2 text-base-content/70">
                                      <pc-icon name="globe-americas" [size]="4" class="opacity-50"></pc-icon>
                                      <span class="truncate">{{ company.website }}</span>
                                    </div>
                                  }
                                  <div class="flex items-center gap-2 text-base-content/70">
                                    <pc-icon name="envelope" [size]="4" class="opacity-50"></pc-icon>
                                    <span class="truncate">{{ company.email || '—' }}</span>
                                  </div>
                                  <div class="flex items-center gap-2 text-base-content/70">
                                    <pc-icon name="identification" [size]="4" class="opacity-50"></pc-icon>
                                    <span>{{ company.phone || '—' }}</span>
                                  </div>
                                  @if (company.industry) {
                                    <div class="flex items-center gap-2 text-base-content/70">
                                      <pc-icon name="briefcase" [size]="4" class="opacity-50"></pc-icon>
                                      <span>{{ company.industry }}</span>
                                    </div>
                                  }
                                  <div class="text-[11px] text-base-content/40">
                                    Created: {{ company.created_at | date: 'short' }}
                                  </div>

                                  <!-- Company Contacts list -->
                                  <div class="mt-3 pt-3 border-t border-base-300/50">
                                    <div class="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-1">
                                      Associated Contacts ({{ company.persons?.length || 0 }}):
                                    </div>
                                    @if (!company.persons?.length) {
                                      <div class="text-xs text-base-content/40 italic">No contacts at company</div>
                                    }
                                    <ul class="list-disc pl-4 space-y-1">
                                      @for (contact of company.persons; track contact.id) {
                                        <li class="text-xs text-base-content/85">
                                          <span class="font-medium"
                                            >{{ contact.first_name }} {{ contact.last_name }}</span
                                          >
                                          @if (contact.email) {
                                            <span class="text-[10px] text-base-content/50 font-light truncate ml-1"
                                              >({{ contact.email }})</span
                                            >
                                          }
                                        </li>
                                      }
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              <div class="flex gap-2 mt-4 pt-3 border-t border-base-300">
                                <button
                                  [class]="
                                    'btn btn-xs flex-1 ' +
                                    (group.selectedTargetId === company.id ? 'btn-success' : 'btn-outline')
                                  "
                                  (click)="selectRole(gIdx, company.id, 'target')"
                                >
                                  Keep (Primary)
                                </button>
                                <button
                                  [class]="
                                    'btn btn-xs flex-1 ' +
                                    (group.selectedSourceId === company.id ? 'btn-error' : 'btn-outline')
                                  "
                                  (click)="selectRole(gIdx, company.id, 'source')"
                                >
                                  Delete (Merge)
                                </button>
                              </div>
                            </div>
                          </div>
                        }
                      }

                      <!-- Merge Actions / Summary Panel -->
                      <div class="card bg-base-300/40 border border-base-300 flex flex-col justify-between">
                        <div class="card-body p-5">
                          <h4 class="font-bold text-base-content mb-2 flex items-center gap-2">
                            <pc-icon name="information-circle" class="text-warning" [size]="5"></pc-icon>
                            Merge Summary
                          </h4>

                          <div class="space-y-3 text-sm flex-1">
                            @if (!group.selectedTargetId || !group.selectedSourceId) {
                              <div class="text-base-content/50 py-4 italic text-center text-xs">
                                Select which record to Keep and which to Merge.
                              </div>
                            }

                            @if (group.selectedTargetId && group.selectedSourceId) {
                              <div class="space-y-3">
                                <div class="alert alert-info py-2 text-[11px] leading-relaxed">
                                  <span>{{ getMergeDescription() }}</span>
                                </div>

                                <!-- Summary Diffs -->
                                <div class="text-xs space-y-1.5 bg-base-100 p-2.5 rounded-lg border border-base-300">
                                  <div class="font-semibold text-base-content/70">Merge Actions:</div>
                                  <div class="flex justify-between text-success gap-2">
                                    <span class="flex-shrink-0">Keep Primary:</span>
                                    <span class="font-bold truncate text-right flex-1" [title]="getTargetName(group)">{{
                                      getTargetName(group)
                                    }}</span>
                                  </div>
                                  <div class="flex justify-between text-error gap-2">
                                    <span class="flex-shrink-0">Remove Duplicate:</span>
                                    <span class="font-bold truncate text-right flex-1" [title]="getSourceName(group)">{{
                                      getSourceName(group)
                                    }}</span>
                                  </div>
                                </div>
                              </div>
                            }
                          </div>

                          <div class="card-actions mt-4 pt-3 border-t border-base-300">
                            <button
                              class="btn btn-primary btn-sm w-full gap-2"
                              [disabled]="!group.selectedTargetId || !group.selectedSourceId"
                              (click)="mergeGroup(gIdx)"
                            >
                              <pc-icon name="merge" [size]="4"></pc-icon>
                              Merge Records
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Pagination Controls -->
            @if (totalPages() > 1) {
              <div
                class="flex flex-col sm:flex-row items-center justify-between mt-8 bg-base-100 border border-base-300 p-4 rounded-xl shadow-sm gap-4"
              >
                <div class="text-sm text-base-content/60 font-light">
                  Page <span class="font-semibold text-base-content">{{ currentPage() }}</span> of
                  <span class="font-semibold text-base-content">{{ totalPages() }}</span>
                  ({{ totalGroups() }} duplicate groups total)
                </div>
                <div class="join">
                  <button
                    class="join-item btn btn-outline btn-sm gap-1"
                    [disabled]="currentPage() === 1"
                    (click)="prevPage()"
                  >
                    <pc-icon name="chevron-left" [size]="4"></pc-icon>
                    Previous
                  </button>
                  <button
                    class="join-item btn btn-outline btn-sm gap-1"
                    [disabled]="currentPage() >= totalPages()"
                    (click)="nextPage()"
                  >
                    Next
                    <pc-icon name="chevron-right" [size]="4"></pc-icon>
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class DuplicateManager implements OnInit {
  private readonly personsSvc = inject(PersonsService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly companiesSvc = inject(CompaniesService);
  private readonly alertSvc = inject(AlertService);
  private readonly router = inject(Router);

  protected readonly selectedMode = signal<'select' | 'people' | 'households' | 'companies'>('select');
  protected readonly isLoading = signal(false);
  protected readonly groups = signal<DuplicateGroup[]>([]);

  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalGroups = signal(0);
  protected readonly totalPages = computed(() => Math.ceil(this.totalGroups() / this.pageSize()));

  public ngOnInit() {
    // We start on the selection screen
  }

  protected setMode(mode: 'select' | 'people' | 'households' | 'companies') {
    this.selectedMode.set(mode);
    this.groups.set([]);
    this.currentPage.set(1);
    this.totalGroups.set(0);
    if (mode !== 'select') {
      this.loadDuplicates();
    }
  }

  protected getModeIcon(): PcIconNameType {
    switch (this.selectedMode()) {
      case 'people':
        return 'identification';
      case 'households':
        return 'house-modern';
      case 'companies':
        return 'briefcase';
      default:
        return 'document-duplicate';
    }
  }

  protected getModeTitle(): string {
    switch (this.selectedMode()) {
      case 'people':
        return 'People';
      case 'households':
        return 'Households';
      case 'companies':
        return 'Companies';
      default:
        return '';
    }
  }

  protected getModeDescription(): string {
    switch (this.selectedMode()) {
      case 'people':
        return 'Review and merge duplicate people records to keep your database clean.';
      case 'households':
        return 'Review and merge duplicate household records sharing the exact same address fingerprint.';
      case 'companies':
        return 'Review and merge duplicate company records sharing the same name.';
      default:
        return '';
    }
  }

  protected getMergeDescription(): string {
    switch (this.selectedMode()) {
      case 'people':
        return 'The duplicate record will be removed, transferring tags, lists, and empty fields to the primary record.';
      case 'households':
        return 'The duplicate household will be removed, transferring all members (people), tags, lists, and empty fields to the primary household.';
      case 'companies':
        return 'The duplicate company will be removed, transferring associated contacts and empty fields to the primary company.';
      default:
        return '';
    }
  }

  protected getItemsCount(group: DuplicateGroup): number {
    if (this.selectedMode() === 'people') return group.persons?.length || 0;
    if (this.selectedMode() === 'households') return group.households?.length || 0;
    if (this.selectedMode() === 'companies') return group.companies?.length || 0;
    return 0;
  }

  protected getFullAddress(hh: any): string {
    const parts = [hh.street_num, hh.street1, hh.street2, hh.apt, hh.city, hh.state, hh.zip, hh.country].filter(
      Boolean,
    );
    return parts.join(', ') || 'No address details';
  }

  protected getTargetName(group: DuplicateGroup): string {
    return this.getItemName(group, group.selectedTargetId);
  }

  protected getSourceName(group: DuplicateGroup): string {
    return this.getItemName(group, group.selectedSourceId);
  }

  protected getItemName(group: DuplicateGroup, id: string | undefined): string {
    if (!id) return '';
    const mode = this.selectedMode();
    if (mode === 'people') {
      const p = group.persons?.find((x) => x.id === id);
      return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : '';
    }
    if (mode === 'households') {
      const hh = group.households?.find((x) => x.id === id);
      if (!hh) return '';
      const street = [hh.street_num, hh.street1, hh.apt].filter(Boolean).join(' ');
      const city = [hh.city, hh.state].filter(Boolean).join(', ');
      return [street, city].filter(Boolean).join(' in ') || `Household ID: ${hh.id}`;
    }
    if (mode === 'companies') {
      const c = group.companies?.find((x) => x.id === id);
      return c ? c.name : '';
    }
    return '';
  }

  protected async loadDuplicates() {
    this.isLoading.set(true);
    try {
      const mode = this.selectedMode();
      let response: { groups: any[]; total: number } = { groups: [], total: 0 };
      const options = { page: this.currentPage(), pageSize: this.pageSize() };
      if (mode === 'people') {
        response = await this.personsSvc.findPotentialDuplicates(options);
      } else if (mode === 'households') {
        response = await this.householdsSvc.findPotentialDuplicates(options);
      } else if (mode === 'companies') {
        response = await this.companiesSvc.findPotentialDuplicates(options);
      }

      this.totalGroups.set(response.total);

      const mappedGroups: DuplicateGroup[] = response.groups.map((g: any) => {
        let selectedTargetId: string | undefined = undefined;
        let selectedSourceId: string | undefined = undefined;
        const items = g.persons || g.households || g.companies || [];
        if (items.length === 2) {
          const i0 = items[0];
          const i1 = items[1];
          const date0 = new Date(i0.created_at).getTime();
          const date1 = new Date(i1.created_at).getTime();
          if (date0 <= date1) {
            selectedTargetId = i0.id;
            selectedSourceId = i1.id;
          } else {
            selectedTargetId = i1.id;
            selectedSourceId = i0.id;
          }
        }
        return {
          ...g,
          selectedTargetId,
          selectedSourceId,
        };
      });
      this.groups.set(mappedGroups);
    } catch (err: any) {
      this.alertSvc.showError('Failed to fetch duplicates');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadDuplicates();
    }
  }

  protected prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadDuplicates();
    }
  }

  protected selectRole(groupIndex: number, itemId: string, role: 'target' | 'source') {
    const current = [...this.groups()];
    const group = current[groupIndex];
    if (role === 'target') {
      group.selectedTargetId = itemId;
      if (group.selectedSourceId === itemId) {
        group.selectedSourceId = undefined;
      }
    } else {
      group.selectedSourceId = itemId;
      if (group.selectedTargetId === itemId) {
        group.selectedTargetId = undefined;
      }
    }
    this.groups.set(current);
  }

  protected async mergeGroup(groupIndex: number) {
    const group = this.groups()[groupIndex];
    const targetId = group.selectedTargetId;
    const sourceId = group.selectedSourceId;
    if (!targetId || !sourceId) return;

    const primaryName = this.getItemName(group, targetId);
    const dupName = this.getItemName(group, sourceId);
    const modeTitle = this.getModeTitle().toLowerCase();

    this.alertSvc.show({
      title: 'Confirm Merge',
      text: `Are you sure you want to merge "${dupName}" into "${primaryName}"? This action will permanently delete this duplicate ${modeTitle} and cannot be undone.`,
      type: 'warning',
      OKBtn: 'Merge',
      btn2: 'Cancel',
      OKBtnCallback: async () => {
        try {
          const mode = this.selectedMode();
          if (mode === 'people') {
            await this.personsSvc.mergePersons(targetId, sourceId);
          } else if (mode === 'households') {
            await this.householdsSvc.mergeHouseholds(targetId, sourceId);
          } else if (mode === 'companies') {
            await this.companiesSvc.mergeCompanies(targetId, sourceId);
          }
          this.alertSvc.showSuccess(`Successfully merged duplicate records into "${primaryName}"`);

          const currentGroups = this.groups().filter((_, idx) => idx !== groupIndex);
          this.groups.set(currentGroups);
          this.totalGroups.update((t) => Math.max(0, t - 1));

          if (currentGroups.length === 0 && this.currentPage() > 1) {
            this.currentPage.update((p) => p - 1);
            this.loadDuplicates();
          } else if (currentGroups.length === 0 && this.totalGroups() > 0) {
            this.loadDuplicates();
          }
        } catch (err: any) {
          this.alertSvc.showError(err?.message || 'Merge failed');
        }
      },
    });
  }

  protected routeToBackList() {
    const mode = this.selectedMode();
    if (mode === 'people') {
      this.router.navigate(['people']);
    } else if (mode === 'households') {
      this.router.navigate(['households']);
    } else if (mode === 'companies') {
      this.router.navigate(['companies']);
    }
  }
}
