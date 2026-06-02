import { FastifyPluginCallback } from 'fastify';
import { VolunteerEventsController } from '../controller';
import formBody from '@fastify/formbody';

const ctrl = new VolunteerEventsController();

// Shared CSS/Design Tokens block
const SHARED_STYLES = `
  :root {
    --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
    --accent: #0ea5e9;
    --accent-hover: #0284c7;
    --accent-glow: rgba(14, 165, 233, 0.15);
    --card-bg: rgba(255, 255, 255, 0.8);
    --card-border: #cbd5e1;
    --card-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 20px 40px -15px rgba(0, 0, 0, 0.05);
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --input-bg: #ffffff;
    --input-border: #cbd5e1;
    --input-focus-border: #0ea5e9;
    --input-focus-ring: rgba(14, 165, 233, 0.15);
    --label-color: #374151;
    --placeholder-color: #9ca3af;
    --success: #2dd4bf;
    --success-glow: rgba(45, 212, 191, 0.15);
    --error: #f37373;
    --error-glow: rgba(243, 115, 115, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-gradient: linear-gradient(135deg, #0b1220 0%, #0e1726 50%, #060a12 100%);
      --accent: #3ea6ff;
      --accent-hover: #1a8cff;
      --accent-glow: rgba(62, 166, 255, 0.2);
      --card-bg: rgba(19, 30, 49, 0.85);
      --card-border: #1a2b45;
      --card-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      --text-primary: #f8fafc;
      --text-secondary: #c7d1e5;
      --input-bg: #0b1220;
      --input-border: #1a2b45;
      --input-focus-border: #3ea6ff;
      --input-focus-ring: rgba(62, 166, 255, 0.25);
      --label-color: #cbd5e1;
      --placeholder-color: #4b5563;
      --error: #ef4444;
      --error-glow: rgba(239, 68, 68, 0.15);
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-weight: 300;
    background: var(--bg-gradient);
    color: var(--text-primary);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 40px 24px;
    position: relative;
    overflow-x: hidden;
  }

  body::before, body::after {
    content: "";
    position: absolute;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: var(--accent);
    filter: blur(150px);
    opacity: 0.06;
    z-index: 0;
    pointer-events: none;
  }
  body::before { top: 15%; left: 10%; }
  body::after { bottom: 15%; right: 10%; }

  .container {
    width: 100%;
    max-width: 800px;
    z-index: 10;
  }

  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 24px;
    padding: 40px;
    width: 100%;
    box-shadow: var(--card-shadow);
    position: relative;
    overflow: hidden;
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }

  .header {
    text-align: center;
    margin-bottom: 32px;
  }

  h1 {
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.015em;
    margin-bottom: 8px;
    background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 15px;
    line-height: 1.5;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--accent);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 24px;
    transition: all 0.2s ease;
  }

  .back-link:hover {
    color: var(--accent-hover);
    transform: translateX(-4px);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const renderErrorHtml = (message: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    ${SHARED_STYLES}
    
    .card-error::before {
      background: linear-gradient(90deg, transparent, var(--error), transparent);
    }

    .icon-container {
      width: 80px;
      height: 80px;
      background: var(--error-glow);
      border: 2px solid var(--error);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
      animation: popIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .icon-container svg {
      width: 38px;
      height: 38px;
      stroke: var(--error);
      stroke-width: 3px;
      fill: none;
    }

    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px 28px;
      background: var(--accent);
      color: #ffffff;
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;
      border-radius: 12px;
      text-align: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px var(--accent-glow);
      margin-top: 24px;
    }

    .btn:hover {
      background: var(--accent-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--accent-glow);
    }
  </style>
</head>
<body>
  <div class="card card-error" style="max-width: 440px; text-align: center; margin-top: 40px;">
    <div class="icon-container">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v4M12 17h.01M12 3a9 9 0 110 18 9 9 0 010-18z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>Operation Failed</h1>
    <p class="subtitle" style="margin-top: 12px;">${message}</p>
    <a href="javascript:history.back()" class="btn">Go Back</a>
  </div>
</body>
</html>
`;

const volunteerEventsPublicRoute: FastifyPluginCallback = (fastify, _, done) => {
  fastify.register(formBody);

  // Success view
  fastify.get('/success', async (req: any, reply) => {
    const { tenantSlug } = req.query;
    const backUrl = tenantSlug ? `/api/events/org/${tenantSlug}` : '#';

    reply.type('text/html');
    return reply.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signup Successful</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    ${SHARED_STYLES}

    .icon-container {
      width: 80px;
      height: 80px;
      background: var(--success-glow);
      border: 2px solid var(--success);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
      position: relative;
    }

    .icon-container svg {
      width: 38px;
      height: 38px;
      stroke: var(--success);
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      stroke-width: 3px;
      fill: none;
      animation: drawCheck 0.6s 0.3s ease-out forwards;
    }

    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px 28px;
      background: var(--accent);
      color: #ffffff;
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;
      border-radius: 12px;
      text-align: center;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px var(--accent-glow);
      margin-top: 24px;
    }

    .btn:hover {
      background: var(--accent-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--accent-glow);
    }

    @keyframes drawCheck {
      to {
        stroke-dashoffset: 0;
      }
    }
  </style>
</head>
<body>
  <div class="card" style="max-width: 440px; text-align: center; margin-top: 40px;">
    <div class="icon-container">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>You're Signed Up!</h1>
    <p class="subtitle" style="margin-top: 12px;">Thank you for volunteering! A confirmation email has been sent to you with the event details.</p>
    <a href="${backUrl}" class="btn">View Other Events</a>
  </div>
</body>
</html>
    `);
  });

  // Events list view for a specific organization/tenant (secure slug lookup)
  fastify.get('/org/:tenantSlug', async (req: any, reply) => {
    const { tenantSlug } = req.params;

    try {
      // Resolve Tenant ID from Secure Slug
      const matchedTenant = await ctrl.getTenantFromSlug(tenantSlug);

      if (!matchedTenant) {
        reply.status(404).type('text/html');
        return reply.send(renderErrorHtml('Organization not found.'));
      }

      const tenantId = String(matchedTenant.id);
      const tenantName = matchedTenant.name;

      const events = await ctrl.getUpcomingEventsPublic(tenantId);

      const eventsListHtml = events.length === 0 
        ? `<div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No upcoming volunteer events scheduled at the moment.</p>
            <p style="font-size: 13px; margin-top: 4px; opacity: 0.7;">Please check back later or contact us directly.</p>
           </div>`
        : events.map((ev) => {
            const start = new Date(ev.start_time);
            const end = new Date(ev.end_time);
            
            // Format dates
            const dateStr = start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            const timeStr = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

            // Roster spots remaining
            const isFull = ev.capacity !== null && Number(ev.volunteers_count || 0) >= ev.capacity;
            const remainingSpots = ev.capacity !== null ? ev.capacity - Number(ev.volunteers_count || 0) : null;
            const capacityBadge = ev.capacity === null
              ? `<span class="badge badge-open">Unlimited Spots Available</span>`
              : isFull 
                ? `<span class="badge badge-full">Event Full</span>`
                : `<span class="badge badge-spots">${remainingSpots} Spots Left</span>`;

            return `
              <div class="event-card">
                <div class="event-card-body">
                  <div class="event-card-main">
                    <h3 class="event-name">${ev.name}</h3>
                    <p class="event-desc">${ev.description || 'No description provided.'}</p>
                    
                    <div class="event-meta">
                      <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>${dateStr} @ ${timeStr}</span>
                      </div>
                      ${ev.location_address ? `
                      <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>${ev.location_address}</span>
                      </div>` : ''}
                    </div>
                  </div>
                  
                  <div class="event-card-footer">
                    ${capacityBadge}
                    ${isFull 
                      ? `<button class="btn btn-disabled" disabled>Event Full</button>` 
                      : `<a href="/api/events/view/${ev.slug}" class="btn">View Details & Sign Up</a>`}
                  </div>
                </div>
              </div>
            `;
          }).join('');

      reply.type('text/html');
      return reply.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volunteer Opportunities - ${tenantName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    ${SHARED_STYLES}

    .event-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 24px;
    }

    .event-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1);
      border-color: var(--accent);
    }

    .event-card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 20px;
    }

    @media (min-width: 768px) {
      .event-card-body {
        flex-direction: row;
        align-items: center;
      }
    }

    .event-card-main {
      flex: 1;
    }

    .event-name {
      font-size: 20px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .event-desc {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .event-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .meta-item svg {
      width: 16px;
      height: 16px;
      opacity: 0.8;
    }

    .event-card-footer {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      min-width: 200px;
    }

    @media (min-width: 768px) {
      .event-card-footer {
        align-items: flex-end;
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      background: var(--accent);
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 8px var(--accent-glow);
      text-align: center;
    }

    .btn:hover:not(.btn-disabled) {
      background: var(--accent-hover);
      box-shadow: 0 6px 14px var(--accent-glow);
    }

    .btn-disabled {
      background: var(--card-border);
      color: var(--text-secondary);
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.6;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-open {
      background: rgba(45, 212, 191, 0.1);
      color: var(--success);
    }

    .badge-spots {
      background: var(--accent-glow);
      color: var(--accent);
    }

    .badge-full {
      background: rgba(243, 115, 115, 0.1);
      color: var(--error);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--card-bg);
      border: 1px dashed var(--card-border);
      border-radius: 16px;
      color: var(--text-secondary);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Volunteer Events</h1>
      <p class="subtitle">Join us and make a difference in our community. Select an upcoming shift below.</p>
    </div>

    <div class="event-grid">
      ${eventsListHtml}
    </div>
  </div>
</body>
</html>
      `);
    } catch (err: any) {
      reply.status(500).type('text/html');
      return reply.send(renderErrorHtml(err.message || 'Failed to load volunteer events.'));
    }
  });

  fastify.get('/view/:eventId', async (req: any, reply) => {
    const { eventId } = req.params;

    if (/^\d+$/.test(eventId)) {
      reply.status(404).type('text/html');
      return reply.send(renderErrorHtml('Event not found.'));
    }

    try {
      const event = await ctrl.getEventPublic(eventId);
      if (!event) {
        reply.status(404).type('text/html');
        return reply.send(renderErrorHtml('Event not found.'));
      }

      const slug = ctrl.getTenantSlug(String(event.tenant_id));
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const hasPassed = end < new Date();
      
      const dateStr = start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const timeStr = `${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

      // Calculate availability
      const isFull = event.capacity !== null && Number(event.volunteers_count || 0) >= event.capacity;
      const remainingSpots = event.capacity !== null ? event.capacity - Number(event.volunteers_count || 0) : null;
      
      reply.type('text/html');
      return reply.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up: ${event.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    ${SHARED_STYLES}

    .grid-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
      margin-top: 20px;
    }

    @media (min-width: 768px) {
      .grid-layout {
        grid-template-columns: 1.2fr 1fr;
      }
    }

    .event-info-panel {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-group {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 24px;
    }

    .info-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .info-desc {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-secondary);
      white-space: pre-line;
    }

    .meta-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .meta-detail-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 14px;
    }

    .meta-detail-row svg {
      width: 20px;
      height: 20px;
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .meta-detail-content h4 {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    .meta-detail-content p {
      color: var(--text-primary);
    }

    .signup-form-panel {
      position: relative;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--label-color);
    }

    input, textarea {
      width: 100%;
      padding: 12px 16px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s ease;
    }

    input::placeholder, textarea::placeholder {
      color: var(--placeholder-color);
    }

    input:hover, textarea:hover {
      border-color: var(--accent);
      opacity: 0.95;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: var(--input-focus-border);
      box-shadow: 0 0 0 4px var(--input-focus-ring);
    }

    textarea {
      resize: vertical;
      min-height: 90px;
    }

    .hp-field {
      display: none !important;
    }

    button {
      width: 100%;
      padding: 14px 28px;
      background: var(--accent);
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px var(--accent-glow);
      margin-top: 8px;
      min-height: 48px;
    }

    button:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--accent-glow);
    }

    button:disabled {
      background: var(--card-border);
      color: var(--text-secondary);
      cursor: not-allowed;
      opacity: 0.6;
      box-shadow: none;
    }

    .spots-alert {
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spots-alert-warning {
      background: rgba(243, 115, 115, 0.1);
      color: var(--error);
      border: 1px solid rgba(243, 115, 115, 0.2);
    }

    .spots-alert-info {
      background: var(--accent-glow);
      color: var(--accent);
      border: 1px solid rgba(14, 165, 233, 0.2);
    }

    .spots-alert-success {
      background: rgba(45, 212, 191, 0.1);
      color: var(--success);
      border: 1px solid rgba(45, 212, 191, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    ${!event.is_private ? `
    <a href="/api/events/org/${slug}" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
      </svg>
      Back to Upcoming Events
    </a>` : ''}

    <div class="header" style="text-align: left; margin-bottom: 24px;">
      <h1>${event.name}</h1>
    </div>

    <div class="grid-layout">
      <!-- Left Panel: Event Details -->
      <div class="event-info-panel">
        <div class="info-group meta-details">
          <div class="meta-detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div class="meta-detail-content">
              <h4>Date & Time</h4>
              <p>${dateStr}</p>
              <p style="font-size: 13px; opacity: 0.8; margin-top: 2px;">${timeStr}</p>
            </div>
          </div>

          ${event.location_address ? `
          <div class="meta-detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div class="meta-detail-content">
              <h4>Location</h4>
              <p>${event.location_address}</p>
            </div>
          </div>` : ''}

          <div class="meta-detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <div class="meta-detail-content">
              <h4>Capacity & Spots</h4>
              <p>${event.capacity === null ? 'Open Signup (No Capacity Limit)' : `${event.capacity} total slots`}</p>
              <p style="font-size: 13px; opacity: 0.8; margin-top: 2px;">${event.volunteers_count || 0} volunteer(s) currently signed up</p>
            </div>
          </div>

          ${event.contact_email || event.contact_phone ? `
          <div class="meta-detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <div class="meta-detail-content">
              <h4>Questions / Contact</h4>
              ${event.contact_email ? `<p><a href="mailto:${event.contact_email}" style="color: var(--accent); text-decoration: none;">${event.contact_email}</a></p>` : ''}
              ${event.contact_phone ? `<p style="margin-top: 2px;">${event.contact_phone}</p>` : ''}
            </div>
          </div>` : ''}
        </div>

        ${event.description ? `
        <div class="info-group">
          <h3 class="info-title">Description</h3>
          <p class="info-desc">${event.description}</p>
        </div>` : ''}
      </div>

      <!-- Right Panel: Registration Form -->
      <div class="signup-form-panel">
        <div class="card">
          <h3 class="info-title" style="margin-bottom: 20px;">Volunteer Signup</h3>

          ${hasPassed
            ? `<div class="spots-alert spots-alert-warning">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
                This event has passed and registration is closed.
               </div>`
            : isFull 
              ? `<div class="spots-alert spots-alert-warning">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
                  This shift is currently fully booked.
                 </div>`
              : remainingSpots !== null && remainingSpots <= 5
                ? `<div class="spots-alert spots-alert-info">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    Hurry! Only ${remainingSpots} spot(s) remaining.
                   </div>`
                : `<div class="spots-alert spots-alert-success">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Spots are available. Sign up below!
                   </div>`
          }

          <form action="/api/events/signup/${event.id}" method="POST">
            <!-- Honeypot Bot Field (leave empty!) -->
            <input type="text" name="_hp" class="hp-field" tabindex="-1" autocomplete="off" />

            <div class="form-group">
              <label for="first_name">First Name</label>
              <input type="text" id="first_name" name="first_name" placeholder="John" ${hasPassed ? 'disabled' : ''} />
            </div>

            <div class="form-group">
              <label for="last_name">Last Name</label>
              <input type="text" id="last_name" name="last_name" placeholder="Doe" ${hasPassed ? 'disabled' : ''} />
            </div>

            <div class="form-group">
              <label for="email">Email Address *</label>
              <input type="email" id="email" name="email" placeholder="john@example.com" required ${hasPassed ? 'disabled' : ''} />
            </div>

            <div class="form-group">
              <label for="mobile">Mobile / Phone Number</label>
              <input type="text" id="mobile" name="mobile" placeholder="E.g. 555-0199" ${hasPassed ? 'disabled' : ''} />
            </div>

            <div class="form-group">
              <label for="notes">Notes / Special Requirements</label>
              <textarea id="notes" name="notes" placeholder="Optional. Any notes or scheduling preferences..." ${hasPassed ? 'disabled' : ''}></textarea>
            </div>

            <button type="submit" ${isFull || hasPassed ? 'disabled' : ''}>${hasPassed ? 'Registration Closed' : 'Sign Up for Shift'}</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
      `);
    } catch (err: any) {
      reply.status(500).type('text/html');
      return reply.send(renderErrorHtml(err.message || 'Failed to load event details.'));
    }
  });

  // Handle volunteer signup POST
  fastify.post('/signup/:eventId', async (req: any, reply) => {
    const { eventId } = req.params;
    const isJsonExpected = req.headers.accept?.includes('application/json') || req.headers['content-type'] === 'application/json';

    if (/^\d+$/.test(eventId)) {
      if (isJsonExpected) {
        return reply.status(404).send({ error: 'Event not found' });
      }
      reply.status(404).type('text/html');
      return reply.send(renderErrorHtml('Event not found.'));
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip;

    try {
      const body = req.body || {};
      
      // Fetch event first to get its tenant_id for the redirect
      const event = await ctrl.getEventPublic(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (new Date(event.end_time) < new Date()) {
        throw new Error('This event has passed and registration is closed.');
      }

      await ctrl.signupVolunteerPublic(eventId, body, clientIp);

      const slug = ctrl.getTenantSlug(String(event.tenant_id));

      if (isJsonExpected) {
        return reply.status(200).send({ success: true, redirect_url: `/api/events/success?tenantSlug=${slug}` });
      }

      return reply.redirect(`/api/events/success?tenantSlug=${slug}`);
    } catch (err: any) {
      fastify.log.error(err);
      const statusCode = err.statusCode || 500;
      const message = err.message || 'An unexpected error occurred during signup.';

      if (isJsonExpected) {
        return reply.status(statusCode).send({ error: message });
      }

      reply.status(statusCode).type('text/html');
      return reply.send(renderErrorHtml(message));
    }
  });

  done();
};

export default volunteerEventsPublicRoute;
