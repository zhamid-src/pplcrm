import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Icon } from '@icons/icon';
import type { KnockOutcome, KnockResponse } from '../../../../../../../libs/common/src';

interface CompanionDoor {
  household_id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  last_outcome: string | null;
}

interface CompanionTurf {
  turf_id: string;
  turf_name: string;
  door_count: number;
  attempted: number;
  doors: CompanionDoor[];
}

interface QueuedKnock {
  token: string;
  client_knock_id: string;
  household_id: string;
  outcome: KnockOutcome;
  response: KnockResponse | null;
  canvasser_name: string | null;
  knocked_at: string;
}

const QUEUE_KEY = 'canvass-companion-queue';
const NAME_KEY = 'canvass-companion-name';

const OUTCOMES: { key: KnockOutcome; label: string }[] = [
  { key: 'conversation', label: 'Talked' },
  { key: 'no_answer', label: 'No answer' },
  { key: 'not_home', label: 'Not home' },
  { key: 'refused', label: 'Refused' },
  { key: 'inaccessible', label: "Can't access" },
];

const RESPONSES: { key: KnockResponse; label: string }[] = [
  { key: 'strong_support', label: 'Strong' },
  { key: 'lean_support', label: 'Lean' },
  { key: 'undecided', label: 'Undecided' },
  { key: 'opposed', label: 'Opposed' },
];

/**
 * Canvass Companion (§13.4) — the tokenised, account-less volunteer app.
 * Offline-tolerant: knocks queue in localStorage and flush when back online.
 */
@Component({
  selector: 'pc-companion-page',
  imports: [Icon],
  templateUrl: './companion-page.html',
})
export class CompanionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);

  protected readonly outcomes = OUTCOMES;
  protected readonly responses = RESPONSES;

  protected readonly token = signal<string>('');
  protected readonly turf = signal<CompanionTurf | null>(null);
  protected readonly loadError = signal<string>('');
  protected readonly loading = signal<boolean>(true);
  protected readonly online = signal<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  protected readonly queued = signal<number>(0);
  protected readonly canvasserName = signal<string>('');
  protected readonly expandedId = signal<string>('');
  protected readonly localOutcomes = signal<Record<string, string>>({});

  protected readonly progress = computed<string>(() => {
    const t = this.turf();
    if (!t) return '';
    const attempted = t.attempted + Object.keys(this.localOutcomes()).length;
    return `${Math.min(attempted, t.door_count)} of ${t.door_count} doors`;
  });

  ngOnInit(): void {
    const stored = typeof localStorage !== 'undefined' ? (localStorage.getItem(NAME_KEY) ?? '') : '';
    this.canvasserName.set(stored);
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.online.set(true);
        void this.flushQueue();
      });
      window.addEventListener('offline', () => this.online.set(false));
    }
    this.queued.set(this.readQueue().length);
    void this.load();
  }

  protected outcomeLabel(key: string): string {
    return OUTCOMES.find((o) => o.key === key)?.label ?? key;
  }

  protected setName(value: string): void {
    this.canvasserName.set(value);
    if (typeof localStorage !== 'undefined') localStorage.setItem(NAME_KEY, value);
  }

  protected toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? '' : id);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    const token = this.token();
    if (!token) {
      this.loadError.set('This canvassing link is missing its token.');
      this.loading.set(false);
      return;
    }
    try {
      const res = await fetch(`/api/canvass/turf?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}));
        const msg =
          body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : '';
        throw new Error(msg || 'Unable to load this turf.');
      }
      const data: unknown = await res.json();
      this.turf.set(this.narrowTurf(data));
      await this.flushQueue();
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Unable to load this turf.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async logKnock(door: CompanionDoor, outcome: KnockOutcome, response: KnockResponse | null): Promise<void> {
    const knock: QueuedKnock = {
      token: this.token(),
      client_knock_id: this.newId(),
      household_id: door.household_id,
      outcome,
      response,
      canvasser_name: this.canvasserName() || null,
      knocked_at: new Date().toISOString(),
    };
    // Optimistic local mark so the door shows progress immediately.
    this.localOutcomes.update((m) => ({ ...m, [door.household_id]: outcome }));
    this.expandedId.set('');

    const sent = await this.send(knock);
    if (!sent) {
      this.enqueue(knock);
    }
  }

  private async flushQueue(): Promise<void> {
    if (!this.online()) return;
    const queue = this.readQueue();
    if (queue.length === 0) return;
    const remaining: QueuedKnock[] = [];
    for (const k of queue) {
      const ok = await this.send(k);
      if (!ok) remaining.push(k);
    }
    this.writeQueue(remaining);
  }

  private async send(knock: QueuedKnock): Promise<boolean> {
    if (!this.online()) return false;
    try {
      const res = await fetch('/api/canvass/knock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(knock),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private enqueue(knock: QueuedKnock): void {
    const queue = this.readQueue();
    queue.push(knock);
    this.writeQueue(queue);
  }

  private readQueue(): QueuedKnock[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as QueuedKnock[]) : [];
    } catch {
      return [];
    }
  }

  private writeQueue(queue: QueuedKnock[]): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    this.queued.set(queue.length);
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private narrowTurf(data: unknown): CompanionTurf {
    if (!data || typeof data !== 'object') throw new Error('Unexpected response.');
    const d = data as Record<string, unknown>;
    const doorsRaw = Array.isArray(d['doors']) ? d['doors'] : [];
    const doors: CompanionDoor[] = doorsRaw.map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        household_id: String(o['household_id'] ?? ''),
        address: String(o['address'] ?? ''),
        lat: o['lat'] == null ? null : Number(o['lat']),
        lng: o['lng'] == null ? null : Number(o['lng']),
        last_outcome: o['last_outcome'] == null ? null : String(o['last_outcome']),
      };
    });
    return {
      turf_id: String(d['turf_id'] ?? ''),
      turf_name: String(d['turf_name'] ?? 'Turf'),
      door_count: Number(d['door_count'] ?? doors.length),
      attempted: Number(d['attempted'] ?? 0),
      doors,
    };
  }
}
