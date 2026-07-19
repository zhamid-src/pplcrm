import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../env', () => ({
  env: { apiUrl: 'https://api.test', sharedSecret: 'test-secret', sendgridFreeTierSubuser: '', sendgridApiKey: '' },
}));

import { buildAutomationFooter } from './automation-mail.handlers';

describe('buildAutomationFooter', () => {
  const url = 'https://api.test/api/unsubscribe/tok';

  it('always carries the unsubscribe link, in both parts', () => {
    const footer = buildAutomationFooter(url);
    expect(footer.html).toContain(`href="${url}"`);
    expect(footer.text).toContain(`Unsubscribe: ${url}`);
  });

  it('includes the org address and disclaimer when present, escaped', () => {
    const footer = buildAutomationFooter(url, '12 Main St\nOttawa', 'Paid for by <The Committee>');
    expect(footer.html).toContain('12 Main St<br>Ottawa');
    expect(footer.html).toContain('Paid for by &lt;The Committee&gt;');
    expect(footer.text).toContain('12 Main St');
    expect(footer.text).toContain('Paid for by <The Committee>');
  });

  it('omits empty address/disclaimer blocks entirely', () => {
    const footer = buildAutomationFooter(url, '  ', '');
    expect(footer.html).not.toContain('<br>');
    expect(footer.text.trim().split('\n').filter(Boolean)).toHaveLength(2); // divider + unsubscribe
  });
});
