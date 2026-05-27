import { FastifyPluginCallback } from 'fastify';
import { WebFormsController } from '../controller';

const webFormsController = new WebFormsController();

const SUCCESS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Successful</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght=400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.15);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
      position: relative;
    }

    body::before, body::after {
      content: "";
      position: absolute;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: var(--accent);
      filter: blur(120px);
      opacity: 0.15;
      z-index: 0;
    }
    body::before { top: 10%; left: 15%; }
    body::after { bottom: 10%; right: 15%; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 48px 32px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      z-index: 10;
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .icon-container {
      width: 80px;
      height: 80px;
      background: var(--accent-glow);
      border: 2px solid var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
      position: relative;
      animation: popIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .icon-container svg {
      width: 38px;
      height: 38px;
      stroke: var(--accent);
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      stroke-width: 3px;
      fill: none;
      animation: drawCheck 0.6s 0.3s ease-out forwards;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.025em;
    }

    p {
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px 28px;
      background: var(--accent);
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }

    .btn:hover {
      background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
    }

    .btn:active {
      transform: translateY(0);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes popIn {
      0% {
        opacity: 0;
        transform: scale(0.6);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes drawCheck {
      to {
        stroke-dashoffset: 0;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>Submission Successful</h1>
    <p>Thank you! Your information has been successfully received and processed.</p>
    <a href="javascript:history.back()" class="btn">Go Back</a>
  </div>
</body>
</html>
`;

const errorHtml = (message: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Error</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
      --accent: #ef4444;
      --accent-glow: rgba(239, 68, 68, 0.15);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
      position: relative;
    }

    body::before, body::after {
      content: "";
      position: absolute;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: var(--accent);
      filter: blur(120px);
      opacity: 0.15;
      z-index: 0;
    }
    body::before { top: 10%; left: 15%; }
    body::after { bottom: 10%; right: 15%; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 48px 32px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      z-index: 10;
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .icon-container {
      width: 80px;
      height: 80px;
      background: var(--accent-glow);
      border: 2px solid var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
      position: relative;
      animation: popIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .icon-container svg {
      width: 38px;
      height: 38px;
      stroke: var(--accent);
      stroke-width: 3px;
      fill: none;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.025em;
    }

    p {
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px 28px;
      background: #374151;
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn:hover {
      background: #4b5563;
      transform: translateY(-2px);
    }

    .btn:active {
      transform: translateY(0);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes popIn {
      0% {
        opacity: 0;
        transform: scale(0.6);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v4M12 17h.01M12 3a9 9 0 110 18 9 9 0 010-18z" stroke-linecap="round" stroke-linejoin="round" stroke="var(--accent)"/>
      </svg>
    </div>
    <h1>Submission Failed</h1>
    <p>${message}</p>
    <a href="javascript:history.back()" class="btn">Go Back</a>
  </div>
</body>
</html>
`;

const webFormsPublicRoute: FastifyPluginCallback = (fastify, _, done) => {
  // Register form URL-encoded parser
  fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, doneParsing) => {
    try {
      const parsed = Object.fromEntries(new URLSearchParams(body as string));
      doneParsing(null, parsed);
    } catch (err: any) {
      doneParsing(err, undefined);
    }
  });

  fastify.get('/success', async (_req, reply) => {
    reply.type('text/html');
    return reply.send(SUCCESS_HTML);
  });

  fastify.get('/view/:formId', async (req: any, reply) => {
    const { formId } = req.params;
    try {
      const form = await webFormsController.getFormPublic(formId);
      if (!form || form.status !== 'active') {
        reply.status(404).type('text/html');
        return reply.send(errorHtml('Web form not found or inactive.'));
      }
      
      const formName = form.name;
      const formDescription = form.description || '';
      
      reply.type('text/html');
      return reply.send(renderFormHtml(formId, formName, formDescription));
    } catch (err: any) {
      reply.status(500).type('text/html');
      return reply.send(errorHtml(err.message || 'Failed to load form.'));
    }
  });

  fastify.post('/submit/:formId', async (req: any, reply) => {
    const { formId } = req.params;
    // Standard reverse-proxy header check, fallback to req.ip
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip;
    const isJsonExpected = req.headers.accept?.includes('application/json') || req.headers['content-type'] === 'application/json';

    try {
      const body = req.body || {};
      const result = await webFormsController.submitFormPublic(formId, body, clientIp);

      if (isJsonExpected) {
        return reply.status(200).send({ success: true, redirect_url: result.redirect_url });
      }

      if (result.redirect_url) {
        return reply.redirect(result.redirect_url);
      }

      return reply.redirect('/api/forms/success');
    } catch (err: any) {
      fastify.log.error(err);
      const statusCode = err.statusCode || 500;
      const message = err.message || 'An unexpected error occurred during submission.';

      if (isJsonExpected) {
        return reply.status(statusCode).send({ error: message });
      }

      reply.status(statusCode).type('text/html');
      return reply.send(errorHtml(message));
    }
  });

  done();
};

export default webFormsPublicRoute;

const renderFormHtml = (formId: string, formName: string, formDescription: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --accent-glow: rgba(99, 102, 241, 0.15);
      --card-bg: rgba(30, 41, 59, 0.65);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --input-bg: rgba(15, 23, 42, 0.6);
      --input-border: rgba(255, 255, 255, 0.1);
      --input-focus-border: #6366f1;
      --input-focus-ring: rgba(99, 102, 241, 0.25);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-gradient);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
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
      opacity: 0.12;
      z-index: 0;
      pointer-events: none;
    }
    body::before { top: 15%; left: 10%; }
    body::after { bottom: 15%; right: 10%; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      z-index: 10;
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      position: relative;
      overflow: hidden;
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
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .description {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 20px;
      position: relative;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #e2e8f0;
      letter-spacing: 0.025em;
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
      color: #64748b;
    }

    input:hover, textarea:hover {
      border-color: rgba(255, 255, 255, 0.15);
      background: rgba(15, 23, 42, 0.7);
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: var(--input-focus-border);
      box-shadow: 0 0 0 4px var(--input-focus-ring);
      background: rgba(15, 23, 42, 0.8);
    }

    textarea {
      resize: vertical;
      min-height: 90px;
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
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      margin-top: 8px;
    }

    button:hover {
      background: var(--accent-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
    }

    button:active {
      transform: translateY(0);
    }

    .hp-field {
      display: none !important;
    }

    .footer-note {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: var(--text-secondary);
      opacity: 0.6;
    }

    .footer-note a {
      color: var(--accent);
      text-decoration: none;
    }

    .footer-note a:hover {
      text-decoration: underline;
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${formName}</h1>
      <p class="description">${formDescription}</p>
    </div>

    <form action="/api/forms/submit/${formId}" method="POST">
      <!-- Honeypot Bot Field (leave empty!) -->
      <input type="text" name="_hp" class="hp-field" tabindex="-1" autocomplete="off" />

      <div class="form-group">
        <label for="first_name">First Name</label>
        <input type="text" id="first_name" name="first_name" placeholder="E.g. John" />
      </div>

      <div class="form-group">
        <label for="last_name">Last Name</label>
        <input type="text" id="last_name" name="last_name" placeholder="E.g. Doe" />
      </div>

      <div class="form-group">
        <label for="email">Email Address *</label>
        <input type="email" id="email" name="email" placeholder="john@example.com" required />
      </div>

      <div class="form-group">
        <label for="mobile">Mobile / Phone</label>
        <input type="text" id="mobile" name="mobile" placeholder="E.g. 555-0199" />
      </div>

      <div class="form-group">
        <label for="notes">Notes / Message</label>
        <textarea id="notes" name="notes" placeholder="How can we help you?"></textarea>
      </div>

      <button type="submit">Submit</button>
    </form>

    <div class="footer-note">
      Powered by <a href="#" target="_blank">PeopleCRM</a>
    </div>
  </div>
</body>
</html>
`;
