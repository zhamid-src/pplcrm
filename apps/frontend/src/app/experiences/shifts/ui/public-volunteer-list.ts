import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { apiBase, tenantQuery } from '../../../shared/public-pages';

interface PublicVolunteerEvent {
  slug: string;
  name: string;
  description: string | null;
  location_address: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  isFull: boolean;
  remaining: number | null;
}

type PageState = 'loading' | 'open' | 'notfound';

/**
 * Unauthenticated volunteer-events listing served at /volunteer on a tenant subdomain, outside the
 * app shell — replaces the old server-rendered /api/events/org/<hmac> page. Each card links to the
 * /v/:slug signup page.
 */
@Component({
  selector: 'pc-public-volunteer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="flex min-h-screen items-start justify-center bg-base-200 px-4 py-10">
      @switch (state()) {
        @case ('loading') {
          <span class="loading loading-spinner loading-lg mt-20 text-primary"></span>
        }
        @case ('open') {
          <div class="w-full max-w-[760px]">
            <div class="mb-6 flex items-center gap-2">
              <div
                class="flex size-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
              >
                {{ orgInitials() }}
              </div>
              <span class="text-sm font-medium text-base-content">{{ orgName() }}</span>
            </div>

            <h1 class="mb-1 text-xl font-semibold text-base-content">Volunteer events</h1>
            <p class="mb-6 text-sm text-base-content/60">
              Join us and make a difference — pick an upcoming event below.
            </p>

            @if (events().length === 0) {
              <div class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-10 text-center">
                <p class="text-sm text-base-content/70">No upcoming volunteer events are scheduled right now.</p>
                <p class="mt-1 text-xs text-base-content/50">Please check back later.</p>
              </div>
            } @else {
              <div class="flex flex-col gap-4">
                @for (ev of events(); track ev.slug) {
                  <div class="pc-panel p-6">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div class="min-w-0">
                        <h2 class="text-base font-semibold text-base-content">{{ ev.name }}</h2>
                        @if (ev.description) {
                          <p class="mt-1 line-clamp-2 text-sm text-base-content/60">{{ ev.description }}</p>
                        }
                        <p class="mt-2 text-sm text-base-content/70">
                          {{ ev.start_time | date: 'EEEE, MMMM d, y' }} · {{ ev.start_time | date: 'shortTime' }} –
                          {{ ev.end_time | date: 'shortTime' }}
                          @if (ev.location_address) {
                            · {{ ev.location_address }}
                          }
                        </p>
                      </div>
                      <div class="flex shrink-0 flex-col items-start gap-2 md:items-end">
                        @if (ev.capacity === null) {
                          <span class="badge badge-success badge-outline text-xs">Unlimited spots</span>
                        } @else if (ev.isFull) {
                          <span class="badge badge-outline text-xs text-base-content/60">Event full</span>
                        } @else {
                          <span class="badge badge-outline badge-primary text-xs tabular-nums">
                            {{ ev.remaining }} {{ ev.remaining === 1 ? 'spot' : 'spots' }} left
                          </span>
                        }
                        @if (!ev.isFull) {
                          <button class="btn btn-primary btn-sm" type="button" (click)="open(ev.slug)">
                            View details and sign up
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            <p class="mt-8 text-center text-xs text-base-content/40">Powered by PeopleCRM</p>
          </div>
        }
        @default {
          <div class="mt-20 w-full max-w-[440px] pc-panel p-8 text-center">
            <h1 class="mb-2 text-xl font-semibold text-base-content">Organization not found</h1>
            <p class="text-sm text-base-content/60">Check the address and try again.</p>
          </div>
        }
      }
    </div>
  `,
})
export class PublicVolunteerListComponent implements OnInit {
  private readonly router = inject(Router);

  protected readonly state = signal<PageState>('loading');
  protected readonly orgName = signal('Our organization');
  protected readonly events = signal<PublicVolunteerEvent[]>([]);

  protected readonly orgInitials = computed(() => {
    const parts = this.orgName().trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'pC';
  });

  public ngOnInit(): void {
    void this.load();
  }

  protected open(slug: string): void {
    void this.router.navigate(['/v', slug]);
  }

  private async load(): Promise<void> {
    try {
      const res = await fetch(`${apiBase()}/api/events/org${tenantQuery()}`);
      if (!res.ok) {
        this.state.set('notfound');
        return;
      }
      const data = await res.json();
      if (data?.orgName) this.orgName.set(String(data.orgName));
      this.events.set(Array.isArray(data.events) ? (data.events as PublicVolunteerEvent[]) : []);
      this.state.set('open');
    } catch {
      this.state.set('notfound');
    }
  }
}
