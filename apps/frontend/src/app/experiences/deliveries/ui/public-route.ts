import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PcMap } from '@uxcommon/components/map/map';
import { StatusBadge } from '@uxcommon/components/status-badge/status-badge';
import { TabBar, type PcTabOption } from '@uxcommon/components/tabs/tabs';
import type { PcMapMarker, PcMapVariant } from '@uxcommon/components/map/map-types';
import { DELIVERY_SKIP_REASONS } from '@common';
import { Icon } from '@icons/icon';

import { apiBase } from '../../../shared/public-pages';

interface PublicStop {
  id: string;
  seq: number;
  first_name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: 'pending' | 'delivered' | 'skipped';
  reason: string | null;
  acted_at: string | null;
}

interface PublicRouteData {
  campaign_name: string;
  route_name: string;
  status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'canceled';
  start: { lat: number; lng: number };
  stops_total: number;
  stops_delivered: number;
  stops: PublicStop[];
}

type PageState = 'loading' | 'ready' | 'notfound';
type ViewMode = 'list' | 'map';

/**
 * Public tokenized volunteer route page (spec §4.4–4.5), served at /r/:token outside the app shell.
 * The token is the only credential; the payload carries first name + address only. Every action
 * posts to the public endpoint and re-renders from the authoritative response.
 */
@Component({
  selector: 'pc-public-route',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PcMap, StatusBadge, Icon, TabBar],
  templateUrl: './public-route.html',
})
export class PublicRoute implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly reasons = DELIVERY_SKIP_REASONS;

  protected readonly state = signal<PageState>('loading');
  protected readonly data = signal<PublicRouteData | null>(null);
  protected readonly view = signal<ViewMode>('list');

  protected readonly viewTabs: PcTabOption[] = [
    { id: 'list', label: 'List' },
    { id: 'map', label: 'Map' },
  ];

  protected setView(view: string): void {
    if (view === 'list' || view === 'map') this.view.set(view);
  }
  protected readonly reasonPickerFor = signal<string | null>(null);
  protected readonly lastActioned = signal<string | null>(null);
  protected readonly selectedStopId = signal<string | null>(null);
  protected readonly busy = signal(false);

  private token = '';

  protected readonly activeStopId = computed(() => this.data()?.stops.find((s) => s.status === 'pending')?.id ?? null);
  protected readonly handled = computed(() => this.data()?.stops.filter((s) => s.status !== 'pending').length ?? 0);
  protected readonly isDone = computed(() => this.data()?.status === 'completed');

  protected readonly markers = computed<PcMapMarker<PublicStop>[]>(() => {
    const d = this.data();
    if (!d) return [];
    const active = this.activeStopId();
    return d.stops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        position: { lat: s.lat as number, lng: s.lng as number },
        variant: this.pinVariant(s, active),
        tooltip: `${s.seq}. ${s.address}`,
        id: s.id,
        payload: s,
      }));
  });

  public ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    void this.load();
  }

  private pinVariant(s: PublicStop, activeId: string | null): PcMapVariant {
    if (s.status === 'delivered') return 'success';
    if (s.status === 'skipped') return 'warning';
    if (s.id === activeId) return 'primary';
    return 'muted';
  }

  protected statusChip(): { type: 'neutral' | 'warning' | 'success'; label: string } {
    const s = this.data()?.status;
    if (s === 'completed') return { type: 'success', label: 'Completed' };
    if (s === 'in_progress') return { type: 'warning', label: 'In progress' };
    return { type: 'neutral', label: 'Not started' };
  }

  protected selectStop(marker: PcMapMarker): void {
    // pc-map's markerClicked emits PcMapMarker<unknown>; the marker id carries our stop id.
    this.selectedStopId.set(marker.id ?? null);
  }

  protected navigate(stop: PublicStop): void {
    if (stop.lat == null || stop.lng == null) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`, '_blank', 'noopener');
  }

  protected openFullRoute(): void {
    const d = this.data();
    if (!d) return;
    const located = d.stops.filter((s) => s.lat != null && s.lng != null);
    if (located.length === 0) return;
    const origin = `${d.start.lat},${d.start.lng}`;
    const dest = located[located.length - 1];
    const waypoints = located
      .slice(0, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join('|');
    const params = new URLSearchParams({ api: '1', origin, destination: `${dest?.lat},${dest?.lng}` });
    if (waypoints) params.set('waypoints', waypoints);
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener');
  }

  protected openReasonPicker(stopId: string): void {
    this.reasonPickerFor.set(stopId);
  }

  protected cancelReason(): void {
    this.reasonPickerFor.set(null);
  }

  protected async deliver(stopId: string): Promise<void> {
    await this.post(stopId, 'deliver');
  }

  protected async skip(stopId: string, reason: string): Promise<void> {
    await this.post(stopId, 'skip', reason);
    this.reasonPickerFor.set(null);
  }

  protected async defer(stopId: string): Promise<void> {
    await this.post(stopId, 'defer');
  }

  protected async undo(stopId: string): Promise<void> {
    await this.post(stopId, 'undo');
  }

  private async load(): Promise<void> {
    if (!this.token) {
      this.state.set('notfound');
      return;
    }
    try {
      const res = await fetch(`${apiBase()}/api/deliveries/r/${encodeURIComponent(this.token)}`);
      if (!res.ok) {
        this.state.set('notfound');
        return;
      }
      this.data.set((await res.json()) as PublicRouteData);
      this.state.set('ready');
    } catch {
      this.state.set('notfound');
    }
  }

  private async post(stopId: string, action: 'deliver' | 'skip' | 'defer' | 'undo', reason?: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const res = await fetch(
        `${apiBase()}/api/deliveries/r/${encodeURIComponent(this.token)}/stops/${encodeURIComponent(stopId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ action, reason: reason ?? null }),
        },
      );
      if (!res.ok) {
        this.state.set('notfound');
        return;
      }
      this.data.set((await res.json()) as PublicRouteData);
      if (action === 'deliver' || action === 'skip') this.lastActioned.set(stopId);
      else if (action === 'undo') this.lastActioned.set(null);
    } catch {
      // Leave state as-is; the volunteer can retry.
    } finally {
      this.busy.set(false);
    }
  }
}
