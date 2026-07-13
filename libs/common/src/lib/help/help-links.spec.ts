import { describe, expect, it } from 'vitest';

import { classifyHelpRoute } from './help-links';

describe('classifyHelpRoute', () => {
  it('classifies an in-help article link and captures its id', () => {
    expect(classifyHelpRoute('/help/dashboard')).toEqual({ kind: 'help', id: 'dashboard' });
  });

  it('keeps nested ids after /help/ intact', () => {
    expect(classifyHelpRoute('/help/getting-started/welcome')).toEqual({
      kind: 'help',
      id: 'getting-started/welcome',
    });
  });

  it('classifies any other internal route as an app route', () => {
    expect(classifyHelpRoute('/people')).toEqual({ kind: 'app', path: '/people' });
    expect(classifyHelpRoute('/deliveries/plan')).toEqual({ kind: 'app', path: '/deliveries/plan' });
  });

  it('treats the bare /help route as an app route (no article id)', () => {
    expect(classifyHelpRoute('/help')).toEqual({ kind: 'app', path: '/help' });
  });

  it('treats /help/ with an empty id as an app route', () => {
    expect(classifyHelpRoute('/help/')).toEqual({ kind: 'app', path: '/help/' });
  });
});
