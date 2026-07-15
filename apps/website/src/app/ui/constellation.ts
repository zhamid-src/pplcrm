import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, viewChild } from '@angular/core';

/* The marketing site is light-only and this canvas sits on the fixed navy
   band, so the palette is literal hex mirroring the shared theme tokens
   (primary #3498db, secondary #22a6b3 in libs/uxcommon themes.css) plus
   harmonious datapoint hues around them. */
const PRIMARY = '#3498db';
const SECONDARY = '#22a6b3';
const PALETTE = ['#3498db', '#22a6b3', '#5b6fd6', '#27ae8f', '#4bb8e8', '#2f66c9', '#54cdc4'] as const;

/** Small satellite dot orbiting a person-node (their "datapoints"). */
interface MiniDot {
  readonly ang: number;
  readonly dist: number;
  readonly r: number;
  readonly color: string;
  readonly phase: number;
  readonly wob: number;
}

/** One drifting person-node in the constellation. */
interface NetNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  boost: number;
  readonly r: number;
  readonly color: string;
  readonly phase: number;
  readonly minis: readonly MiniDot[];
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

/**
 * The people-network constellation: drifting person-dots, each with its own
 * cluster of datapoints, linked by proximity threads that brighten near the
 * pointer. Canvas-based and browser-only (started in afterNextRender, so the
 * prerender emits an empty canvas). Honors prefers-reduced-motion by drawing
 * a single static frame. Size it from the call site; the host fills its box.
 */
@Component({
  selector: 'pc-constellation',
  template: `<canvas #canvas class="block h-full w-full"></canvas>`,
  host: { class: 'block' },
})
export class Constellation {
  /** Number of person-dots; 0 derives it from the canvas area. */
  public readonly density = input<number>(0);
  /** Playback speed multiplier. */
  public readonly speed = input<number>(1);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private nodes: NetNode[] = [];
  private readonly mouse = { x: -1e4, y: -1e4, active: false };
  private visible = true;
  private animated = true;
  private raf = 0;
  private last = 0;
  private time = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let resizeObs: ResizeObserver | null = null;
    let intersectObs: IntersectionObserver | null = null;

    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx = canvas.getContext('2d');
      if (!this.ctx) return;

      this.animated = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resizeObs = new ResizeObserver(() => this.resize());
      resizeObs.observe(this.hostRef.nativeElement);
      this.resize();

      if (!this.animated) return;

      intersectObs = new IntersectionObserver((entries) => {
        this.visible = entries[0]?.isIntersecting ?? true;
      });
      intersectObs.observe(this.hostRef.nativeElement);
      canvas.addEventListener('pointermove', (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left;
        this.mouse.y = e.clientY - r.top;
        this.mouse.active = true;
      });
      canvas.addEventListener('pointerleave', () => {
        this.mouse.active = false;
      });

      const loop = (now: number): void => {
        this.raf = requestAnimationFrame(loop);
        if (!this.visible || !this.w) return;
        this.frame(now);
      };
      this.raf = requestAnimationFrame(loop);
    });

    destroyRef.onDestroy(() => {
      // raf is only ever set in the browser; the prerenderer has no cancelAnimationFrame.
      if (this.raf) cancelAnimationFrame(this.raf);
      resizeObs?.disconnect();
      intersectObs?.disconnect();
    });
  }

  private resize(): void {
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    const canvas = this.canvasRef().nativeElement;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
    if (!this.animated) this.frame(0);
  }

  /** (Re)scatter the nodes with rough even spacing and per-node datapoint clusters. */
  private seed(): void {
    const w = this.w;
    const h = this.h;
    const n = this.density() > 0 ? this.density() : clamp(Math.round((w * h) / 16000), 14, 70);
    const margin = 36;
    const nodes: NetNode[] = [];
    const minDist = Math.sqrt((w * h) / n) * 0.55;
    for (let i = 0; i < n; i++) {
      let x = 0;
      let y = 0;
      let ok = false;
      let tries = 0;
      while (!ok && tries < 40) {
        x = margin + Math.random() * (w - margin * 2);
        y = margin + Math.random() * (h - margin * 2);
        ok = nodes.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > minDist * minDist);
        tries++;
      }
      const ang = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 6; // px/sec drift
      const k = 4 + Math.floor(Math.random() * 4); // 4..7 datapoints
      const base = Math.random() * Math.PI * 2;
      const colors = [...PALETTE].sort(() => Math.random() - 0.5);
      const minis: MiniDot[] = [];
      for (let j = 0; j < k; j++) {
        minis.push({
          ang: base + (j - (k - 1) / 2) * 0.42 + (Math.random() - 0.5) * 0.15,
          dist: 9 + Math.random() * 8,
          r: 1.8 + Math.random() * 1.1,
          color: colors[j % colors.length] ?? PRIMARY,
          phase: Math.random() * Math.PI * 2,
          wob: 0.4 + Math.random() * 0.6,
        });
      }
      nodes.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        boost: 0,
        r: 3.4 + Math.random() * 2.2,
        color: Math.random() < 0.55 ? PRIMARY : SECONDARY,
        phase: Math.random() * Math.PI * 2,
        minis,
      });
    }
    this.nodes = nodes;
  }

  private linkDist(): number {
    return clamp(Math.min(this.w, this.h) * 0.32, 90, 190);
  }

  private frame(now: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000) * this.speed();
    this.last = now;
    this.time += dt;
    const t = this.time;
    const nodes = this.nodes;
    const L = this.linkDist();
    const m = this.mouse;

    ctx.clearRect(0, 0, w, h);
    for (const nd of nodes) {
      nd.x += nd.vx * dt;
      nd.y += nd.vy * dt;
      if (nd.x < 10) {
        nd.x = 10;
        nd.vx = Math.abs(nd.vx);
      }
      if (nd.x > w - 10) {
        nd.x = w - 10;
        nd.vx = -Math.abs(nd.vx);
      }
      if (nd.y < 10) {
        nd.y = 10;
        nd.vy = Math.abs(nd.vy);
      }
      if (nd.y > h - 10) {
        nd.y = h - 10;
        nd.vy = -Math.abs(nd.vy);
      }
      nd.boost = m.active ? clamp(1 - Math.hypot(nd.x - m.x, nd.y - m.y) / 150, 0, 1) : 0;
    }
    // proximity links, brightened near the pointer
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!a) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        if (!b) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d >= L) continue;
        const alpha = (1 - d / L) * 0.42;
        const glow = Math.max(a.boost, b.boost);
        ctx.strokeStyle = rgba(PRIMARY, alpha * (1 + glow * 1.3));
        ctx.lineWidth = 1 + glow * 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    // threads from the pointer to nearby people
    if (m.active) {
      for (const nd of nodes) {
        const d = Math.hypot(nd.x - m.x, nd.y - m.y);
        if (d < 160) {
          ctx.strokeStyle = rgba(SECONDARY, (1 - d / 160) * 0.5);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(nd.x, nd.y);
          ctx.stroke();
        }
      }
    }
    // person-nodes and their datapoint clusters
    for (const nd of nodes) {
      const r = nd.r * (1 + nd.boost * 0.7) * (1 + 0.06 * Math.sin(t * 1.4 + nd.phase));
      ctx.fillStyle = rgba(nd.color, 0.14 * (1 + nd.boost));
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(nd.color, 0.95);
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
      ctx.fill();
      const spread = 1 + nd.boost * 1.9;
      for (const mn of nd.minis) {
        const dist = mn.dist * spread + Math.sin(t * mn.wob + mn.phase) * 1.2;
        ctx.fillStyle = rgba(mn.color, 0.9);
        ctx.beginPath();
        ctx.arc(nd.x + Math.cos(mn.ang) * dist, nd.y + Math.sin(mn.ang) * dist, mn.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
