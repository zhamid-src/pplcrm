import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { GettingStartedService } from './getting-started.service';
import { NewslettersService } from '../../newsletters/services/newsletters-service';
import { PersonsService } from '../../persons/services/persons-service';
import { SettingsService } from '../../settings/services/settings-service';

interface SetupOptions {
  contacts?: number;
  newsletters?: number;
  contactsThrows?: boolean;
  verifiedEmails?: string[];
  verifiedDomains?: { domain: string; status: string }[];
}

function setup(opts: SetupOptions = {}): GettingStartedService {
  const persons = {
    count: opts.contactsThrows
      ? vi.fn().mockRejectedValue(new Error('boom'))
      : vi.fn().mockResolvedValue(opts.contacts ?? 0),
  };
  const newsletters = { count: vi.fn().mockResolvedValue(opts.newsletters ?? 0) };
  const settings = {
    load: vi.fn().mockResolvedValue({}),
    getValue: vi.fn((key: string) => {
      if (key === 'communications.verified_emails') return opts.verifiedEmails;
      if (key === 'communications.verified_domains') return opts.verifiedDomains;
      return undefined;
    }),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: PersonsService, useValue: persons },
      { provide: NewslettersService, useValue: newsletters },
      { provide: SettingsService, useValue: settings },
    ],
  });
  return TestBed.inject(GettingStartedService);
}

describe('GettingStartedService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('builds steps with evidence from real counts and a verified email', async () => {
    const svc = setup({ contacts: 5012, newsletters: 0, verifiedEmails: ['hello@riverton.vote'] });
    await svc.refresh();

    const steps = svc.steps();
    expect(steps).not.toBeNull();
    const byId = Object.fromEntries((steps ?? []).map((s) => [s.id, s]));

    expect(byId['import']).toMatchObject({ done: true, evidence: '5,012 imported' });
    expect(byId['verify-sender']).toMatchObject({ done: true, evidence: 'hello@riverton.vote verified' });
    expect(byId['first-newsletter']).toMatchObject({ done: false, evidence: null });

    expect(svc.doneCount()).toBe(2);
    expect(svc.total()).toBe(3);
    expect(svc.nextStep()?.id).toBe('first-newsletter');
    expect(svc.visible()).toBe(true);
  });

  it('falls back to a verified domain when no verified emails exist', async () => {
    const svc = setup({ contacts: 1, verifiedDomains: [{ domain: 'riverton.vote', status: 'verified' }] });
    await svc.refresh();

    expect(svc.steps()?.find((s) => s.id === 'verify-sender')).toMatchObject({
      done: true,
      evidence: 'riverton.vote verified',
    });
  });

  it('treats a pending (unverified) domain as not done', async () => {
    const svc = setup({ verifiedDomains: [{ domain: 'riverton.vote', status: 'pending' }] });
    await svc.refresh();

    expect(svc.steps()?.find((s) => s.id === 'verify-sender')?.done).toBe(false);
  });

  it('hides the card when every step is complete', async () => {
    const svc = setup({ contacts: 10, newsletters: 2, verifiedEmails: ['a@b.com'] });
    await svc.refresh();

    expect(svc.doneCount()).toBe(3);
    expect(svc.visible()).toBe(false);
  });

  it('is not visible before the first refresh', () => {
    const svc = setup();
    expect(svc.visible()).toBe(false);
  });

  it('dismiss persists and blocks a later refresh', async () => {
    const svc = setup({ contacts: 5, newsletters: 0 });
    await svc.refresh();
    expect(svc.visible()).toBe(true);

    svc.dismiss();
    expect(svc.visible()).toBe(false);
    expect(localStorage.getItem('pc-getting-started-dismissed')).toBe('1');
  });

  it('does not build steps at all when already dismissed', async () => {
    localStorage.setItem('pc-getting-started-dismissed', '1');
    const svc = setup({ contacts: 5 });
    await svc.refresh();

    expect(svc.steps()).toBeNull();
    expect(svc.visible()).toBe(false);
  });

  it('counts a failed contact lookup as zero rather than throwing', async () => {
    const svc = setup({ contactsThrows: true, newsletters: 0 });
    await svc.refresh();

    expect(svc.steps()?.find((s) => s.id === 'import')?.done).toBe(false);
  });
});
