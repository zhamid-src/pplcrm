import type { FastifyPluginCallback } from 'fastify';

import emailsApiRoute from './modules/emails/routes/emails-api.route';
import msSyncCallbackRoute from './modules/ms-sync/ms-callback.route';
import googleSyncCallbackRoute from './modules/google-sync/google-callback.route';
import filesRoute from './modules/files/routes/files.route';
import exportsDownloadRoute from './modules/exports/routes/exports-download.route';
import importsDownloadRoute from './modules/imports/routes/imports-download.route';
import webFormsPublicRoute from './modules/web-forms/routes/web-forms-public.route';
import volunteerEventsPublicRoute from './modules/volunteer-events/routes/volunteer-events-public.route';
import eventsPublicRoute from './modules/events/routes/events-public.route';
import billingWebhookRoute from './modules/billing/routes/billing-webhook.route';
import newslettersWebhookRoute from './modules/newsletters/routes/newsletters-webhook.route';
import postmarkWebhookRoute from './modules/mail/routes/postmark-webhook.route';
import donationsWebhookRoute from './modules/donations/routes/donations-webhook.route';
import zapierInboundRoute from './modules/zapier/zapier-inbound.route';
import canvassPublicRoute from './modules/canvassing/routes/canvass-public.route';
import deliveriesPublicRoute from './modules/deliveries/routes/deliveries-public.route';
import companionPublicRoute from './modules/companion-access/routes/companion-public.route';

export const routes: FastifyPluginCallback = (fastify, _opts, done) => {
  // --- Public REST routes (No Auth required) ---

  // Register public web forms submission REST routes
  fastify.register(webFormsPublicRoute, { prefix: '/api/forms' });

  // Register public volunteer events REST routes
  fastify.register(volunteerEventsPublicRoute, { prefix: '/api/events' });

  // Register public Canvass Companion REST routes (tokenised, no account — §13.4)
  fastify.register(canvassPublicRoute, { prefix: '/api/canvass' });

  // Register public RSVP event pages REST routes
  fastify.register(eventsPublicRoute, { prefix: '/api/event-pages' });

  // Register public volunteer delivery-route pages (token is the credential, §14)
  fastify.register(deliveriesPublicRoute, { prefix: '/api/deliveries' });

  // Companion access layer: verify + approve gate for both volunteer companions
  fastify.register(companionPublicRoute, { prefix: '/api/companion' });

  // Register Stripe billing webhook route
  fastify.register(billingWebhookRoute, { prefix: '/api/billing' });

  // Register Stripe donations webhook route
  fastify.register(donationsWebhookRoute, { prefix: '/api/donations' });

  // Register SendGrid newsletters event webhook route
  fastify.register(newslettersWebhookRoute, { prefix: '/api/newsletters' });

  // Register Postmark transactional bounce/spam-complaint webhook route
  fastify.register(postmarkWebhookRoute, { prefix: '/api/postmark' });

  // Register Zapier inbound action routes (API key auth handled inside route)
  fastify.register(zapierInboundRoute, { prefix: '/api/zapier' });

  // Microsoft OAuth2 callback (must be a REST route — browser is redirected here by Microsoft)
  fastify.register(msSyncCallbackRoute, { prefix: '/auth/ms' });

  // Google OAuth2 callback (must be a REST route — browser is redirected here by Google)
  fastify.register(googleSyncCallbackRoute, { prefix: '/auth/google' });

  // Register exports download REST route (auth handled inside route via query token)
  fastify.register(exportsDownloadRoute, { prefix: '/api/exports' });

  // Register imports download REST routes — retained source file + skipped-rows CSV (spec §17)
  fastify.register(importsDownloadRoute, { prefix: '/api/imports' });

  // Register email attachments REST routes (auth handled inside route via token/query token)
  fastify.register(emailsApiRoute, { prefix: '/api/emails' });

  // Register files download REST route (auth handled inside route via token/query token)
  fastify.register(filesRoute, { prefix: '/api/files' });

  // Root health check endpoint
  fastify.get('/', (_req, res) => res.send({ message: 'API healthy.' }));

  done();
};
