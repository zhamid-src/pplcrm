import { FastifyPluginCallback } from 'fastify';
import { EventsController } from '../controller';

const ctrl = new EventsController();

const STYLES = `
  :root {
    --bg: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
    --accent: #0ea5e9;
    --accent-hover: #0284c7;
    --accent-glow: rgba(14,165,233,0.15);
    --card-bg: rgba(255,255,255,0.85);
    --card-border: #cbd5e1;
    --card-shadow: 0 10px 30px -10px rgba(0,0,0,0.08);
    --text: #1f2937;
    --muted: #6b7280;
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: linear-gradient(135deg,#0b1220 0%,#0e1726 50%,#060a12 100%);
      --card-bg: rgba(19,30,49,0.85);
      --card-border: #1a2b45;
      --card-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
      --text: #f8fafc;
      --muted: #c7d1e5;
    }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 40px 24px;
  }
  .container { max-width: 720px; margin: 0 auto; }
  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 32px;
    box-shadow: var(--card-shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  h1 { font-size: 28px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
  .subtitle { color: var(--muted); font-size: 15px; line-height: 1.6; }
  .divider { border: none; border-top: 1px solid var(--card-border); margin: 24px 0; }
  .meta { display: flex; flex-direction: column; gap: 14px; }
  .meta-row { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; }
  .meta-row svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; stroke: var(--accent); fill: none; stroke-width: 2; }
  .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 2px; }
  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 9999px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    margin-bottom: 16px;
  }
  .badge-upcoming { background: rgba(14,165,233,.12); color: var(--accent); }
  .badge-past { background: rgba(107,114,128,.12); color: var(--muted); }
  .badge-unpublished { background: rgba(245,158,11,.12); color: var(--warning); }
  .tickets { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
  .ticket-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border: 1px solid var(--card-border); border-radius: 12px;
    background: rgba(255,255,255,0.4);
  }
  .ticket-name { font-weight: 600; font-size: 14px; }
  .ticket-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .ticket-price { font-size: 14px; font-weight: 700; color: var(--accent); white-space: nowrap; }
  .ticket-cap { font-size: 11px; color: var(--muted); margin-top: 2px; text-align: right; }
  .contact-block { margin-top: 20px; padding: 16px; background: rgba(14,165,233,.06); border-radius: 12px; font-size: 14px; }
  .contact-block a { color: var(--accent); text-decoration: none; }
  .not-found { text-align: center; padding: 60px 20px; }
  .not-found h1 { font-size: 22px; margin-bottom: 8px; }
`;

const eventsPublicRoute: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('/view/:slug', async (req: any, reply) => {
    const { slug } = req.params;

    let event: any;
    try {
      event = await ctrl.getEventBySlug(slug);
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).type('text/html');
      return reply.send(page('Error', `<div class="not-found"><h1>Something went wrong.</h1><p class="subtitle">Please try again later.</p></div>`));
    }

    if (!event) {
      reply.status(404).type('text/html');
      return reply.send(page('Event Not Found', `<div class="not-found"><h1>Event not found</h1><p class="subtitle">This event page doesn't exist or hasn't been published yet.</p></div>`));
    }

    let ticketTypes: any[] = [];
    try {
      ticketTypes = await ctrl.getTicketTypesByEventId(String(event.id), String(event.tenant_id));
    } catch { /* ignore */ }

    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const isPast = end < now;

    const dateStr = start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

    const badge = isPast
      ? `<span class="badge badge-past">Past Event</span>`
      : `<span class="badge badge-upcoming">Upcoming</span>`;

    const ticketsHtml = ticketTypes.length === 0 ? '' : `
      <hr class="divider" />
      <h3 style="font-size:15px;font-weight:600;margin-bottom:12px;">Tickets</h3>
      <div class="tickets">
        ${ticketTypes.map((t) => `
          <div class="ticket-row">
            <div>
              <div class="ticket-name">${esc(t.name)}</div>
              ${t.description ? `<div class="ticket-desc">${esc(t.description)}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div class="ticket-price">${t.price_cents ? `$${(t.price_cents / 100).toFixed(2)}` : 'Free'}</div>
              ${t.capacity ? `<div class="ticket-cap">${t.capacity} spots</div>` : ''}
            </div>
          </div>`).join('')}
      </div>`;

    const contactHtml = (event.contact_email || event.contact_phone) ? `
      <div class="contact-block">
        <strong>Questions?</strong> Contact the organizer:
        ${event.contact_email ? ` <a href="mailto:${esc(event.contact_email)}">${esc(event.contact_email)}</a>` : ''}
        ${event.contact_email && event.contact_phone ? ' · ' : ''}
        ${event.contact_phone ? esc(event.contact_phone) : ''}
      </div>` : '';

    const body = `
      <div class="card">
        ${badge}
        <h1>${esc(event.name)}</h1>
        ${event.description ? `<p class="subtitle" style="margin-top:8px;">${esc(event.description)}</p>` : ''}
        <hr class="divider" />
        <div class="meta">
          <div class="meta-row">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div><div class="meta-label">Date & Time</div>${dateStr}<br/><span style="opacity:.7;font-size:13px;">${timeStr}</span></div>
          </div>
          ${event.location_address ? `
          <div class="meta-row">
            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div><div class="meta-label">Location</div>${esc(event.location_address)}</div>
          </div>` : ''}
          ${event.capacity ? `
          <div class="meta-row">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <div><div class="meta-label">Capacity</div>${event.capacity} attendees</div>
          </div>` : ''}
        </div>
        ${ticketsHtml}
        ${contactHtml}
      </div>`;

    reply.type('text/html');
    return reply.send(page(`${event.name}`, body));
  });

  done();
};

function esc(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${esc(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">${body}</div>
</body>
</html>`;
}

export default eventsPublicRoute;
