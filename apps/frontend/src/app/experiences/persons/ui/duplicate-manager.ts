import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonsService } from '../services/persons-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { Router } from '@angular/router';

interface DuplicateGroup {
  reason: string;
  persons: any[];
  selectedTargetId?: string;
  selectedSourceId?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-duplicate-manager',
  imports: [CommonModule, Icon],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <pc-icon name="document-duplicate" class="text-primary" [size]="7"></pc-icon>
            Manage Duplicate Contacts
          </h1>
          <p class="text-sm text-base-content/60 mt-1">
            Review and merge duplicate people records to keep your database clean.
          </p>
        </div>
        <button class="btn btn-outline btn-sm gap-2" (click)="loadDuplicates()">
          <pc-icon name="arrow-path" [size]="4"></pc-icon>
          Scan Again
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-20">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/60 mt-4 font-light">Scanning database for potential duplicates...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && groups().length === 0" class="card bg-base-100 border border-base-300 shadow-xl max-w-xl mx-auto mt-10">
        <div class="card-body items-center text-center py-16">
          <div class="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mb-4 animate-bounce">
            <pc-icon name="check-circle" class="text-success" [size]="10"></pc-icon>
          </div>
          <h2 class="card-title text-xl font-bold text-success">Clean Database!</h2>
          <p class="text-base-content/60 mt-2">
            Awesome! No potential duplicate contacts were found based on identical emails or addresses.
          </p>
          <div class="card-actions mt-6">
            <button class="btn btn-primary" (click)="routeToPeople()">Go to Contacts</button>
          </div>
        </div>
      </div>

      <!-- Duplicate Groups Feed -->
      <div *ngIf="!isLoading() && groups().length > 0" class="grid gap-6">
        <div 
          *ngFor="let group of groups(); let gIdx = index" 
          class="card bg-base-100 border border-base-300 shadow-xl overflow-hidden hover:border-primary/30 transition-all duration-200"
        >
          <!-- Group Title -->
          <div class="bg-base-200/50 px-6 py-4 border-b border-base-300 flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="badge badge-warning badge-sm">Warning</span>
              <h3 class="font-bold text-base-content">{{ group.reason }}</h3>
            </div>
            <span class="text-xs text-base-content/50">{{ group.persons.length }} matching records</span>
          </div>

          <!-- Group Details -->
          <div class="card-body p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- Select Primary & Duplicate Cards -->
              <div 
                *ngFor="let person of group.persons" 
                class="card bg-base-200/40 border transition-all duration-200"
                [ngClass]="{
                  'border-success bg-success/5 shadow': group.selectedTargetId === person.id,
                  'border-error bg-error/5 opacity-80': group.selectedSourceId === person.id,
                  'border-base-300': group.selectedTargetId !== person.id && group.selectedSourceId !== person.id
                }"
              >
                <div class="card-body p-4 justify-between h-full">
                  <div>
                    <h4 class="font-bold text-lg text-base-content flex justify-between items-center">
                      <span>{{ person.first_name }} {{ person.last_name }}</span>
                      <span class="text-xs font-light text-base-content/40">ID: {{ person.id }}</span>
                    </h4>

                    <!-- Fields list -->
                    <div class="mt-3 space-y-1.5 text-sm">
                      <div class="flex items-center gap-2 text-base-content/70">
                        <pc-icon name="envelope" [size]="4" class="opacity-50"></pc-icon>
                        <span class="truncate" [title]="person.email || 'No email'">{{ person.email || '—' }}</span>
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
                        Created: {{ person.created_at | date:'short' }}
                      </div>
                    </div>
                  </div>

                  <!-- Radio Buttons to select Role -->
                  <div class="flex gap-2 mt-4 pt-3 border-t border-base-300">
                    <button 
                      class="btn btn-xs flex-1" 
                      [ngClass]="group.selectedTargetId === person.id ? 'btn-success' : 'btn-outline'"
                      (click)="selectRole(gIdx, person.id, 'target')"
                    >
                      Keep (Primary)
                    </button>
                    <button 
                      class="btn btn-xs flex-1" 
                      [ngClass]="group.selectedSourceId === person.id ? 'btn-error' : 'btn-outline'"
                      (click)="selectRole(gIdx, person.id, 'source')"
                    >
                      Delete (Merge)
                    </button>
                  </div>
                </div>
              </div>

              <!-- Merge Actions / Summary Panel -->
              <div class="card bg-base-300/40 border border-base-300 flex flex-col justify-between">
                <div class="card-body p-5">
                  <h4 class="font-bold text-base-content mb-2 flex items-center gap-2">
                    <pc-icon name="information-circle" class="text-warning" [size]="4.5"></pc-icon>
                    Merge Summary
                  </h4>
                  
                  <div class="space-y-3 text-sm flex-1">
                    <div *ngIf="!group.selectedTargetId || !group.selectedSourceId" class="text-base-content/50 py-4 italic text-center">
                      Select which contact to Keep and which to Merge.
                    </div>
                    
                    <div *ngIf="group.selectedTargetId && group.selectedSourceId" class="space-y-3">
                      <div class="alert alert-info py-2 text-xs">
                        <span>The duplicate record will be removed, transferring tags, lists, and empty fields to the primary record.</span>
                      </div>
                      
                      <!-- Summary Diffs -->
                      <div class="text-xs space-y-1.5 bg-base-100 p-2.5 rounded-lg border border-base-300">
                        <div class="font-semibold text-base-content/70">Merge Actions:</div>
                        <div class="flex justify-between text-success">
                          <span>Keep Primary:</span>
                          <span class="font-bold truncate max-w-[150px]">{{ getPersonName(group, group.selectedTargetId) }}</span>
                        </div>
                        <div class="flex justify-between text-error">
                          <span>Remove Duplicate:</span>
                          <span class="font-bold truncate max-w-[150px]">{{ getPersonName(group, group.selectedSourceId) }}</span>
                        </div>
                      </div>
                    </div>
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
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }
  `]
})
export class DuplicateManager implements OnInit {
  private readonly personsSvc = inject(PersonsService);
  private readonly alertSvc = inject(AlertService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly groups = signal<DuplicateGroup[]>([]);

  public ngOnInit() {
    this.loadDuplicates();
  }

  protected async loadDuplicates() {
    this.isLoading.set(true);
    try {
      const dbGroups = await this.personsSvc.findPotentialDuplicates();
      const mappedGroups: DuplicateGroup[] = dbGroups.map((g: any) => {
        let selectedTargetId: string | undefined = undefined;
        let selectedSourceId: string | undefined = undefined;
        if (g.persons?.length === 2) {
          const p0 = g.persons[0];
          const p1 = g.persons[1];
          const date0 = new Date(p0.created_at).getTime();
          const date1 = new Date(p1.created_at).getTime();
          if (date0 <= date1) {
            selectedTargetId = p0.id;
            selectedSourceId = p1.id;
          } else {
            selectedTargetId = p1.id;
            selectedSourceId = p0.id;
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

  protected selectRole(groupIndex: number, personId: string, role: 'target' | 'source') {
    const current = [...this.groups()];
    const group = current[groupIndex];
    if (role === 'target') {
      group.selectedTargetId = personId;
      if (group.selectedSourceId === personId) {
        group.selectedSourceId = undefined;
      }
    } else {
      group.selectedSourceId = personId;
      if (group.selectedTargetId === personId) {
        group.selectedTargetId = undefined;
      }
    }
    this.groups.set(current);
  }

  protected getPersonName(group: DuplicateGroup, id: string): string {
    const p = group.persons.find((x) => x.id === id);
    return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : '';
  }

  protected async mergeGroup(groupIndex: number) {
    const group = this.groups()[groupIndex];
    const targetId = group.selectedTargetId;
    const sourceId = group.selectedSourceId;
    if (!targetId || !sourceId) return;

    const primaryName = this.getPersonName(group, targetId);
    const dupName = this.getPersonName(group, sourceId);

    this.alertSvc.show({
      title: 'Confirm Merge',
      text: `Are you sure you want to merge "${dupName}" into "${primaryName}"? This action will permanently delete "${dupName}" and cannot be undone.`,
      type: 'warning',
      OKBtn: 'Merge',
      btn2: 'Cancel',
      OKBtnCallback: async () => {
        this.alertSvc.showInfo('Merging records...');
        try {
          await this.personsSvc.mergePersons(targetId, sourceId);
          this.alertSvc.showSuccess(`Successfully merged duplicate records into "${primaryName}"`);
          await this.loadDuplicates();
        } catch (err: any) {
          this.alertSvc.showError(err?.message || 'Merge failed');
        }
      }
    });
  }

  protected routeToPeople() {
    this.router.navigate(['people']);
  }
}
