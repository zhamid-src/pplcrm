import { describe, expect, it } from 'vitest';

import {
  buildAiFindings,
  buildSpamAssassinFinding,
  computeScore,
  lintNewsletterContent,
  preflightHashInput,
} from './preflight-lint';
import { PREFLIGHT_BLOCK, PREFLIGHT_GOOD, preflightBand } from './schemas/content-check.schema';
import type { AiPreflightVerdict } from './schemas/content-check.schema';

const CLEAN_HTML =
  '<h1>October update</h1>' +
  '<p>Here is what our volunteers accomplished this month. We knocked on 1,200 doors and signed up ' +
  '85 new supporters across the ward. Thank you to everyone who gave a Saturday morning.</p>' +
  '<p><a href="https://vote-jane.example.org/volunteer">Join the next canvass</a></p>' +
  '<img src="https://vote-jane.example.org/img/team.jpg" alt="Volunteers at the launch">';

function codes(findings: { code: string }[]): string[] {
  return findings.map((f) => f.code);
}

describe('lintNewsletterContent', () => {
  it('passes a clean newsletter with no findings and a perfect score', () => {
    const findings = lintNewsletterContent({ subject: 'October volunteer update', html: CLEAN_HTML });
    expect(findings).toEqual([]);
    expect(computeScore(findings)).toBe(100);
    expect(preflightBand(computeScore(findings))).toBe('good');
  });

  it('blocks an empty subject and skips further subject checks', () => {
    const findings = lintNewsletterContent({ subject: '   ', html: CLEAN_HTML });
    expect(codes(findings)).toContain('subject-empty');
    expect(codes(findings)).not.toContain('subject-caps');
  });

  it('flags shouty, exclamation-heavy, money-symbol subjects', () => {
    const findings = lintNewsletterContent({ subject: 'FREE MONEY $$$ ACT NOW!!!', html: CLEAN_HTML });
    const c = codes(findings);
    expect(c).toContain('subject-caps');
    expect(c).toContain('subject-exclamations');
    expect(c).toContain('subject-money-symbols');
  });

  it('flags a fake reply prefix and an over-long subject', () => {
    const long = 'Re: ' + 'a very long subject line '.repeat(5);
    const c = codes(lintNewsletterContent({ subject: long, html: CLEAN_HTML }));
    expect(c).toContain('subject-fake-reply');
    expect(c).toContain('subject-too-long');
  });

  it('warns on image-only bodies and missing alt text', () => {
    const html = '<img src="https://x.example.com/big.png"><p>Hi</p>';
    const c = codes(lintNewsletterContent({ subject: 'Update', html }));
    expect(c).toContain('image-only-body');
    expect(c).toContain('images-missing-alt');
  });

  it('heavily deducts base64 data-URI images', () => {
    const html = `<p>${'text '.repeat(60)}</p><img src="data:image/png;base64,AAAA" alt="x">`;
    const findings = lintNewsletterContent({ subject: 'Update', html });
    expect(codes(findings)).toContain('base64-image');
    expect(findings.find((f) => f.code === 'base64-image')?.severity).toBe('block');
  });

  it('warns on URL shorteners and plain-http links', () => {
    const html =
      `<p>${'text '.repeat(60)}</p>` +
      '<a href="https://bit.ly/x">click</a><a href="http://insecure.example.com">read</a>';
    const c = codes(lintNewsletterContent({ subject: 'Update', html }));
    expect(c).toContain('url-shortener');
    expect(c).toContain('insecure-urls');
  });

  it('blocks raw-IP links, script protocols, and anchor/href domain mismatches', () => {
    const html =
      `<p>${'text '.repeat(60)}</p>` +
      '<a href="https://93.184.216.34/pay">pay</a>' +
      '<a href="javascript:alert(1)">hi</a>' +
      '<a href="https://evil.example.net">www.yourbank.com</a>';
    const findings = lintNewsletterContent({ subject: 'Update', html });
    const c = codes(findings);
    expect(c).toContain('raw-ip-link');
    expect(c).toContain('suspicious-protocol');
    expect(c).toContain('anchor-domain-mismatch');
    expect(preflightBand(computeScore(findings))).toBe('blocked');
  });

  it('does not call same-site subdomain anchors a mismatch', () => {
    const html = `<p>${'text '.repeat(60)}</p><a href="https://donate.example.org/x">example.org/donate</a>`;
    expect(codes(lintNewsletterContent({ subject: 'Update', html }))).not.toContain('anchor-domain-mismatch');
  });

  it('warns when the HTML approaches the Gmail clip size', () => {
    const html = `<p>${'x'.repeat(100_001)}</p>`;
    expect(codes(lintNewsletterContent({ subject: 'Update', html }))).toContain('html-oversize');
  });

  it('warns on link-stuffed bodies', () => {
    const links = Array.from({ length: 26 }, (_, i) => `<a href="https://a.example.com/${i}">l${i}</a>`).join(' ');
    const html = `<p>${'text '.repeat(60)}</p>${links}`;
    expect(codes(lintNewsletterContent({ subject: 'Update', html }))).toContain('too-many-links');
  });
});

describe('lintNewsletterContent boundaries and robustness', () => {
  it('treats the documented limits as inclusive/exclusive exactly at the edge', () => {
    // Subject limit is 70: at the limit passes, one over warns.
    const at = 'x'.repeat(70);
    expect(codes(lintNewsletterContent({ subject: at, html: CLEAN_HTML }))).not.toContain('subject-too-long');
    expect(codes(lintNewsletterContent({ subject: at + 'x', html: CLEAN_HTML }))).toContain('subject-too-long');

    // Link limit is 25: exactly 25 passes.
    const links = Array.from({ length: 25 }, (_, i) => `<a href="https://a.example.com/${i}">l${i}</a>`).join(' ');
    expect(
      codes(lintNewsletterContent({ subject: 'Update', html: `<p>${'text '.repeat(60)}</p>${links}` })),
    ).not.toContain('too-many-links');

    // Oversize warning starts at 100KB; just under stays quiet.
    const under = `<p>${'x'.repeat(99_000)}</p>`;
    expect(codes(lintNewsletterContent({ subject: 'Update', html: under }))).not.toContain('html-oversize');
  });

  it('does not call short subjects shouty (caps check needs a minimum sample)', () => {
    // 7 letters, all caps — below the 8-letter sample floor.
    expect(codes(lintNewsletterContent({ subject: 'ACT NOW', html: CLEAN_HTML }))).not.toContain('subject-caps');
  });

  it('allows up to two separated exclamation marks', () => {
    expect(codes(lintNewsletterContent({ subject: 'Big win! More soon!', html: CLEAN_HTML }))).not.toContain(
      'subject-exclamations',
    );
    expect(codes(lintNewsletterContent({ subject: 'Big win!!', html: CLEAN_HTML }))).toContain('subject-exclamations');
  });

  it('ignores relative, mailto and malformed hrefs instead of crashing or flagging them', () => {
    const html =
      `<p>${'text '.repeat(60)}</p>` +
      '<a href="/local/path">Read more</a>' +
      '<a href="mailto:team@example.org">Write us</a>' +
      '<a href="not a url">Broken</a>';
    const findings = lintNewsletterContent({ subject: 'Update', html });
    expect(findings).toEqual([]);
  });

  it('does not read "e.g."-style anchor text as a domain claim', () => {
    const html = `<p>${'text '.repeat(60)}</p><a href="https://a.example.com/x">e.g. our volunteer page</a>`;
    expect(codes(lintNewsletterContent({ subject: 'Update', html }))).not.toContain('anchor-domain-mismatch');
  });

  it('does not flag a text-only email as image-only', () => {
    expect(codes(lintNewsletterContent({ subject: 'Update', html: '<p>Hi</p>' }))).not.toContain('image-only-body');
  });
});

describe('computeScore + bands', () => {
  it('clamps to 0 and maps bands at the exact thresholds', () => {
    expect(computeScore([{ code: 'x', severity: 'block', message: '', hint: '', deduction: 500 }])).toBe(0);
    expect(preflightBand(PREFLIGHT_GOOD)).toBe('good');
    expect(preflightBand(PREFLIGHT_GOOD - 1)).toBe('fix');
    expect(preflightBand(PREFLIGHT_BLOCK)).toBe('fix');
    expect(preflightBand(PREFLIGHT_BLOCK - 1)).toBe('blocked');
  });
});

describe('buildSpamAssassinFinding', () => {
  it('returns null below the surfacing threshold', () => {
    expect(buildSpamAssassinFinding(1.2)).toBeNull();
  });

  it('scales the deduction with the score and caps it', () => {
    expect(buildSpamAssassinFinding(4)?.severity).toBe('info');
    expect(buildSpamAssassinFinding(6)?.severity).toBe('warn');
    expect(buildSpamAssassinFinding(6)?.deduction).toBe(6);
    expect(buildSpamAssassinFinding(50)?.deduction).toBe(30);
  });

  it('surfaces the score at exactly the info threshold with a zero deduction', () => {
    const f = buildSpamAssassinFinding(3);
    expect(f?.severity).toBe('info');
    expect(f?.deduction).toBe(0);
  });
});

describe('buildAiFindings', () => {
  const base: AiPreflightVerdict = {
    contentType: 'fundraising_appeal',
    spamRiskScore: 0,
    reasons: [],
    deceptionFlags: [],
    suggestions: [],
    confidence: 0.9,
  };

  it('produces no findings for a clean allowed verdict', () => {
    expect(buildAiFindings(base)).toEqual([]);
  });

  it('caps the score for confident scam/phishing verdicts', () => {
    const findings = buildAiFindings({ ...base, contentType: 'scam_or_phishing', confidence: 0.9 });
    expect(codes(findings)).toContain('ai-scam-phishing');
    expect(preflightBand(computeScore(findings))).toBe('blocked');
  });

  it('treats a low-confidence disallowed verdict as advisory only', () => {
    const findings = buildAiFindings({ ...base, contentType: 'pure_commercial_marketing', confidence: 0.4 });
    expect(codes(findings)).not.toContain('ai-commercial-marketing');
  });

  it('scales the risk deduction by confidence and surfaces deception flags', () => {
    const findings = buildAiFindings({
      ...base,
      spamRiskScore: 80,
      confidence: 0.5,
      reasons: ['manufactured urgency'],
      deceptionFlags: ['fake deadline'],
    });
    const risk = findings.find((f) => f.code === 'ai-spam-risk');
    expect(risk?.deduction).toBe(16);
    expect(risk?.severity).toBe('warn');
    expect(codes(findings)).toContain('ai-deception-flags');
  });

  it('omits the risk finding entirely when the confidence-scaled deduction rounds to zero', () => {
    const findings = buildAiFindings({ ...base, spamRiskScore: 2, confidence: 0.2 });
    expect(codes(findings)).not.toContain('ai-spam-risk');
  });

  it('keeps a moderate risk score advisory (info, not warn)', () => {
    const risk = buildAiFindings({ ...base, spamRiskScore: 40, confidence: 1 }).find((f) => f.code === 'ai-spam-risk');
    expect(risk?.severity).toBe('info');
  });

  it('blocks at exactly the minimum disallowed-content confidence', () => {
    const findings = buildAiFindings({ ...base, contentType: 'scam_or_phishing', confidence: 0.6 });
    expect(codes(findings)).toContain('ai-scam-phishing');
  });
});

describe('preflightHashInput', () => {
  it('separates fields unambiguously and defaults plain text to empty', () => {
    expect(preflightHashInput('a', 'b', null)).toBe('a\u0000b\u0000');
    expect(preflightHashInput('a', 'b', 'c')).not.toBe(preflightHashInput('ab', '', 'c'));
  });
});
