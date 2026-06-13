import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-duplicate-selection',
  imports: [RouterLink, Icon],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
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
          <a
            routerLink="people"
            class="card bg-base-100 border border-base-300 shadow hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer group p-5 flex flex-row items-center justify-between gap-6 no-underline"
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
          </a>

          <a
            routerLink="households"
            class="card bg-base-100 border border-base-300 shadow hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer group p-5 flex flex-row items-center justify-between gap-6 no-underline"
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
          </a>

          <a
            routerLink="companies"
            class="card bg-base-100 border border-base-300 shadow hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer group p-5 flex flex-row items-center justify-between gap-6 no-underline"
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
          </a>
        </div>
      </div>
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
export class DuplicateSelectionComponent {}
