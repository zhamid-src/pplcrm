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
