import type { FastifyPluginCallback } from 'fastify';
import formBody from '@fastify/formbody';
import { TRPCError } from '@trpc/server';
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
    --card-shadow: 0 10px 30px -10px rgba(0,0,0,0.08), 0 20px 40px -15px rgba(0,0,0,0.05);
    --text: #1f2937;
    --text-muted: #6b7280;
    --input-bg: #ffffff;
    --input-border: #cbd5e1;
    --input-focus-border: #0ea5e9;
    --input-focus-ring: rgba(14,165,233,0.15);
    --label-color: #374151;
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
      --text-muted: #c7d1e5;
      --input-bg: #0b1220;
      --input-border: #1a2b45;
      --input-focus-border: #3ea6ff;
      --input-focus-ring: rgba(62,166,255,0.25);
      --label-color: #cbd5e1;
      --accent: #3ea6ff;
    }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 300;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 40px 24px;
  }
  body::before, body::after {
    content: "";
    position: fixed;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: var(--accent);
    filter: blur(150px);
    opacity: 0.06;
    z-index: 0;
    pointer-events: none;
  }
  body::before { top: 15%; left: 10%; }
  body::after { bottom: 15%; right: 10%; }
  .container { max-width: 860px; margin: 0 auto; position: relative; z-index: 1; }
  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 32px;
    box-shadow: var(--card-shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  .card::before {
    content: "";
    display: block;
    height: 3px;
    margin: -32px -32px 32px;
    border-radius: 20px 20px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }
  @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  h1 { font-size: 26px; font-weight: 700; line-height: 1.2; margin-bottom: 6px; }
  h3 { font-size: 17px; font-weight: 600; margin-bottom: 16px; }
  .subtitle { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-top: 4px; }
  .layout { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 24px; }
  @media (min-width: 680px) { .layout { grid-template-columns: 1.2fr 1fr; } }
  .meta-list { display: flex; flex-direction: column; gap: 14px; }
  .meta-row { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; }
  .meta-row svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; stroke: var(--accent); fill: none; stroke-width: 2; }
  .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); margin-bottom: 2px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing:.05em; margin-bottom: 16px; }
  .badge-upcoming { background: rgba(14,165,233,.12); color: var(--accent); }
  .badge-past { background: rgba(107,114,128,.12); color: var(--text-muted); }
  .divider { border: none; border-top: 1px solid var(--card-border); margin: 20px 0; }
  .tickets { display: flex; flex-direction: column; gap: 10px; }
  .ticket-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid var(--card-border); border-radius:12px; }
  .ticket-name { font-weight:600; font-size:14px; }
  .ticket-price { font-size:14px; font-weight:700; color:var(--accent); }
  .spots-alert { padding:10px 14px; border-radius:10px; font-size:13px; font-weight:500; margin-bottom:18px; display:flex; align-items:center; gap:8px; }
  .spots-warn { background:rgba(239,68,68,.1); color:var(--error); border:1px solid rgba(239,68,68,.2); }
  .spots-info { background:var(--accent-glow); color:var(--accent); border:1px solid rgba(14,165,233,.2); }
  .spots-ok { background:rgba(16,185,129,.1); color:var(--success); border:1px solid rgba(16,185,129,.2); }
  label { display:block; font-size:13px; font-weight:500; margin-bottom:7px; color:var(--label-color); }
  input, textarea, select {
    width:100%; padding:11px 14px;
    background:var(--input-bg); border:1px solid var(--input-border);
    border-radius:10px; color:var(--text); font-size:14px; font-family:inherit;
    transition: border-color .2s, box-shadow .2s;
  }
  input:focus, textarea:focus, select:focus { outline:none; border-color:var(--input-focus-border); box-shadow:0 0 0 4px var(--input-focus-ring); }
  textarea { resize:vertical; min-height:80px; }
  .hp-field { display:none !important; }
  .form-group { margin-bottom:18px; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
  button[type=submit] {
    width:100%; padding:13px 24px;
    background:var(--accent); color:#fff;
    font-size:15px; font-weight:600;
    border:none; border-radius:12px; cursor:pointer;
    transition: background .2s, transform .2s, box-shadow .2s;
    box-shadow:0 4px 12px var(--accent-glow); margin-top:6px;
  }
  button[type=submit]:hover:not(:disabled) { background:var(--accent-hover); transform:translateY(-1px); box-shadow:0 6px 18px var(--accent-glow); }
  button[type=submit]:disabled { background:var(--card-border); color:var(--text-muted); cursor:not-allowed; box-shadow:none; }
  .not-found { text-align:center; padding:60px 20px; }
`;

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

function getStatusFromError(err: any): number {
  if (err instanceof TRPCError) {
    switch (err.code) {
      case 'BAD_REQUEST':
        return 400;
      case 'NOT_FOUND':
        return 404;
      case 'CONFLICT':
        return 409;
      case 'TOO_MANY_REQUESTS':
        return 429;
      default:
        return 500;
    }
  }
  return err.statusCode || 500;
}

function buildRsvpFormFields(fields: string[], disabled: boolean): string {
  const fieldSet = new Set(fields);
  const isEnabled = (f: string) => fieldSet.has(f) || fieldSet.has(`${f}:required`);
  const isRequired = (f: string) => fieldSet.has(`${f}:required`);

  const html: string[] = [];

  html.push(`<input type="text" name="_hp" class="hp-field" tabindex="-1" autocomplete="off" />`);

  if (isEnabled('first_name') && isEnabled('last_name')) {
    html.push(`<div class="form-row">
      <div>
        <label for="first_name">First Name${isRequired('first_name') ? ' *' : ''}</label>
        <input type="text" id="first_name" name="first_name" placeholder="First Name" ${isRequired('first_name') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>
      <div>
        <label for="last_name">Last Name${isRequired('last_name') ? ' *' : ''}</label>
        <input type="text" id="last_name" name="last_name" placeholder="Last Name" ${isRequired('last_name') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>
    </div>`);
  } else {
    if (isEnabled('first_name')) {
      html.push(`<div class="form-group">
        <label for="first_name">First Name${isRequired('first_name') ? ' *' : ''}</label>
        <input type="text" id="first_name" name="first_name" placeholder="First Name" ${isRequired('first_name') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>`);
    }
    if (isEnabled('last_name')) {
      html.push(`<div class="form-group">
        <label for="last_name">Last Name${isRequired('last_name') ? ' *' : ''}</label>
        <input type="text" id="last_name" name="last_name" placeholder="Last Name" ${isRequired('last_name') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>`);
    }
  }

  // Email is always required
  html.push(`<div class="form-group">
    <label for="email">Email Address *</label>
    <input type="email" id="email" name="email" placeholder="you@example.com" required ${disabled ? 'disabled' : ''} />
  </div>`);

  if (isEnabled('mobile')) {
    html.push(`<div class="form-group">
      <label for="mobile">Mobile / Phone${isRequired('mobile') ? ' *' : ''}</label>
      <input type="text" id="mobile" name="mobile" placeholder="E.g. 555-0199" ${isRequired('mobile') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
    </div>`);
  }

  if (isEnabled('street1')) {
    html.push(`<div class="form-group">
      <label for="street1">Street Address${isRequired('street1') ? ' *' : ''}</label>
      <input type="text" id="street1" name="street1" placeholder="E.g. 123 Main St" ${isRequired('street1') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
    </div>`);
  }

  if (isEnabled('city') && isEnabled('zip')) {
    html.push(`<div class="form-row">
      <div>
        <label for="city">City${isRequired('city') ? ' *' : ''}</label>
        <input type="text" id="city" name="city" placeholder="City" ${isRequired('city') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>
      <div>
        <label for="zip">Zip / Postal Code${isRequired('zip') ? ' *' : ''}</label>
        <input type="text" id="zip" name="zip" placeholder="E.g. M5V 2T6" ${isRequired('zip') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>
    </div>`);
  } else {
    if (isEnabled('city')) {
      html.push(
        `<div class="form-group"><label for="city">City${isRequired('city') ? ' *' : ''}</label><input type="text" id="city" name="city" ${isRequired('city') ? 'required' : ''} ${disabled ? 'disabled' : ''} /></div>`,
      );
    }
    if (isEnabled('zip')) {
      html.push(
        `<div class="form-group"><label for="zip">Zip / Postal Code${isRequired('zip') ? ' *' : ''}</label><input type="text" id="zip" name="zip" ${isRequired('zip') ? 'required' : ''} ${disabled ? 'disabled' : ''} /></div>`,
      );
    }
  }

  if (isEnabled('state') && isEnabled('country')) {
    html.push(`<div class="form-row">
      <div>
        <label for="state">State / Province${isRequired('state') ? ' *' : ''}</label>
        <input type="text" id="state" name="state" placeholder="E.g. ON" ${isRequired('state') ? 'required' : ''} ${disabled ? 'disabled' : ''} />
      </div>
      <div>
        <label for="country">Country${isRequired('country') ? ' *' : ''}</label>
        <select id="country" name="country" ${isRequired('country') ? 'required' : ''} ${disabled ? 'disabled' : ''}>
          <option value="">Select…</option>
          <option value="CA">Canada</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
        </select>
      </div>
    </div>`);
  } else {
    if (isEnabled('state')) {
      html.push(
        `<div class="form-group"><label for="state">State / Province${isRequired('state') ? ' *' : ''}</label><input type="text" id="state" name="state" ${isRequired('state') ? 'required' : ''} ${disabled ? 'disabled' : ''} /></div>`,
      );
    }
    if (isEnabled('country')) {
      html.push(
        `<div class="form-group"><label for="country">Country${isRequired('country') ? ' *' : ''}</label><select id="country" name="country" ${isRequired('country') ? 'required' : ''} ${disabled ? 'disabled' : ''}><option value="">Select…</option><option value="CA">Canada</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="AU">Australia</option></select></div>`,
      );
    }
  }

  if (isEnabled('notes')) {
    html.push(`<div class="form-group">
      <label for="notes">Notes / Message${isRequired('notes') ? ' *' : ''}</label>
      <textarea id="notes" name="notes" placeholder="Any notes or questions…" ${isRequired('notes') ? 'required' : ''} ${disabled ? 'disabled' : ''}></textarea>
    </div>`);
  }

  return html.join('\n');
}

const eventsPublicRoute: FastifyPluginCallback = (fastify, _, done) => {
  fastify.register(formBody);

  // Success page
  fastify.get('/rsvp-success', async (_req: any, reply) => {
    reply.type('text/html');
    return reply.send(
      page(
        'RSVP Confirmed',
        `
      <div class="card" style="max-width:440px;margin:40px auto;text-align:center;">
        <div style="width:72px;height:72px;background:rgba(16,185,129,.1);border:2px solid #10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1>You're Registered!</h1>
        <p class="subtitle" style="margin-top:10px;">Thank you! A confirmation email with event details has been sent to you.</p>
      </div>`,
      ),
    );
  });

  // Event detail + RSVP form
  fastify.get('/view/:slug', async (req: any, reply) => {
    const { slug } = req.params;

    let event: any;
    try {
      event = await ctrl.getEventBySlug(slug);
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).type('text/html');
      return reply.send(page('Error', `<div class="not-found"><h1>Something went wrong.</h1></div>`));
    }

    if (!event) {
      reply.status(404).type('text/html');
      return reply.send(
        page(
          'Event Not Found',
          `<div class="not-found"><h1>Event not found</h1><p class="subtitle">This event page doesn't exist or hasn't been published yet.</p></div>`,
        ),
      );
    }

    let ticketTypes: any[] = [];
    try {
      ticketTypes = await ctrl.getTicketTypesByEventId(String(event.id), String(event.tenant_id));
    } catch {
      /* ignore */
    }

    // Count current registrations for capacity display
    let regCount = 0;
    try {
      regCount = await ctrl.getRegistrationCountForEvent(String(event.id), String(event.tenant_id));
    } catch {
      /* ignore */
    }

    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const isPast = end < now;
    const isFull = event.capacity !== null && regCount >= event.capacity;
    const remaining = event.capacity !== null ? Math.max(0, event.capacity - regCount) : null;

    const fields: string[] = Array.isArray(event.fields)
      ? event.fields
      : typeof event.fields === 'string'
        ? JSON.parse(event.fields)
        : ['first_name', 'last_name', 'email', 'mobile', 'notes'];

    const dateStr = start.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

    const badge = isPast
      ? `<span class="badge badge-past">Past Event</span>`
      : `<span class="badge badge-upcoming">Upcoming</span>`;

    const ticketsHtml =
      ticketTypes.length === 0
        ? ''
        : `
      <hr class="divider" />
      <h3>Tickets</h3>
      <div class="tickets">
        ${ticketTypes
          .map(
            (t) => `
          <div class="ticket-row">
            <div>
              <div class="ticket-name">${esc(t.name)}</div>
              ${t.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${esc(t.description)}</div>` : ''}
            </div>
            <div class="ticket-price">${t.price_cents ? `$${(t.price_cents / 100).toFixed(2)}` : 'Free'}${t.capacity ? ` <span style="font-size:11px;font-weight:400;color:var(--text-muted);">· ${t.capacity} spots</span>` : ''}</div>
          </div>`,
          )
          .join('')}
      </div>`;

    const contactHtml =
      event.contact_email || event.contact_phone
        ? `
      <hr class="divider" />
      <div style="font-size:13px;color:var(--text-muted);">
        <strong style="color:var(--text);">Questions?</strong>
        ${event.contact_email ? ` <a href="mailto:${esc(event.contact_email)}" style="color:var(--accent);">${esc(event.contact_email)}</a>` : ''}
        ${event.contact_email && event.contact_phone ? ' · ' : ''}
        ${event.contact_phone ? esc(event.contact_phone) : ''}
      </div>`
        : '';

    // Capacity alert for RSVP form panel
    let spotsAlert = '';
    if (isPast) {
      spotsAlert = `<div class="spots-alert spots-warn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>This event has passed.</div>`;
    } else if (isFull) {
      spotsAlert = `<div class="spots-alert spots-warn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>This event is fully booked.</div>`;
    } else if (remaining !== null && remaining <= 5) {
      spotsAlert = `<div class="spots-alert spots-info"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Hurry! Only ${remaining} spot(s) remaining.</div>`;
    } else {
      spotsAlert = `<div class="spots-alert spots-ok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${remaining === null ? 'Unlimited spots available. Register below!' : `${remaining} spot(s) available. Register below!`}</div>`;
    }

    const disabled = isPast || isFull;
    const formFieldsHtml = buildRsvpFormFields(fields, disabled);

    const body = `
      <div class="card">
        ${badge}
        <h1>${esc(event.name)}</h1>
        ${event.description ? `<p class="subtitle">${esc(event.description)}</p>` : ''}

        <hr class="divider" />

        <div class="layout">
          <!-- Left: Event info -->
          <div>
            <div class="meta-list">
              <div class="meta-row">
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div><div class="meta-label">Date & Time</div>${dateStr}<br/><span style="font-size:13px;opacity:.7;">${timeStr}</span></div>
              </div>
              ${
                event.location_address
                  ? `
              <div class="meta-row">
                <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div><div class="meta-label">Location</div>${esc(event.location_address)}</div>
              </div>`
                  : ''
              }
              ${
                event.capacity
                  ? `
              <div class="meta-row">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                <div><div class="meta-label">Capacity</div>${remaining !== null ? `${remaining} of ${event.capacity} spots left` : `${event.capacity} total`}</div>
              </div>`
                  : ''
              }
            </div>
            ${ticketsHtml}
            ${contactHtml}
          </div>

          <!-- Right: RSVP form -->
          <div>
            <h3>RSVP for this Event</h3>
            ${spotsAlert}
            <form action="/api/event-pages/rsvp/${esc(event.slug)}" method="POST">
              ${formFieldsHtml}
              <button type="submit" ${disabled ? 'disabled' : ''}>${isPast ? 'Registration Closed' : isFull ? 'Fully Booked' : 'Confirm RSVP'}</button>
            </form>
          </div>
        </div>
      </div>`;

    reply.type('text/html');
    return reply.send(page(event.name, body));
  });

  // Handle RSVP form POST
  fastify.post('/rsvp/:slug', async (req: any, reply) => {
    const { slug } = req.params;
    const isJson =
      req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip;

    try {
      await ctrl.rsvpPublic(slug, req.body || {}, clientIp);

      if (isJson) return reply.status(200).send({ success: true });
      return reply.redirect('/api/event-pages/rsvp-success');
    } catch (err) {
      fastify.log.error(err);
      const status = getStatusFromError(err);
      const message = err instanceof Error && err.message ? err.message : 'An unexpected error occurred.';

      if (isJson) return reply.status(status).send({ error: message });

      reply.status(status).type('text/html');
      return reply.send(
        page(
          'Error',
          `
        <div class="card" style="max-width:440px;margin:40px auto;text-align:center;">
          <h1 style="color:var(--error);">Error</h1>
          <p class="subtitle" style="margin-top:10px;">${esc(message)}</p>
          <div style="margin-top:20px;"><a href="javascript:history.back()" style="color:var(--accent);font-size:14px;">← Go back</a></div>
        </div>`,
        ),
      );
    }
  });

  done();
};

export default eventsPublicRoute;
