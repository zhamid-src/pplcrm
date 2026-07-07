# PeopleCRM — New Newsletter: Implementation Handoff

**Scope:** the "New newsletter" creation flow only. This package is additive to the main handoff (`handoff/IMPLEMENTATION.md` + `UX-GUIDELINES.md`) — those rules apply verbatim here (tokens, copy grammar, motion, explained-disabled, Inter 400).
**Source of truth:** the `nlnew` screen in `PeopleCRM North Star.dc.html` (Newsletters → "New newsletter"), Design notes ON — 4 pins annotate the decisions. Lift copy verbatim.
**Real-code anchors:** `experiences/newsletters/ui/newsletter-add.{html,ts}`, `visual-newsletter-editor.*`, `newsletter-templates.ts`. The wizard keeps your existing 4-step architecture and template set — this is an evolution, not a rewrite.

---

## 1. The wizard

**Steps:** Template → Content → Audience & details → Review & send. Rendered as pill steps with numbers (not DaisyUI `steps` ticks): current = primary solid, completed = primary tint and **clickable**, future = muted with the reason in the tooltip ("Complete the current step first") — never a silent `pointer-events:none` dead zone.

**Step 1 — Template.** Your four templates (Welcome email, Announcement, Weekly digest, Empty canvas) as selectable cards: preview area, icon tile (heroicons — replace the emoji 👋🚀📰📄), name + one-line description, selected = primary border + 6% tint. Sentence-case names.

**Step 2 — Content.** The visual block editor mounts here (unchanged, `pc-visual-newsletter-editor`). Around it: a **"Send test email"** button (toast confirms recipient: "Sent a test of \"{subject}\" to {user email}") and a helper line noting merge fields (`{{first_name}}`) and that the footer disclaimer + unsubscribe append automatically from **Workspace settings → Communications** (link the words).

**Step 3 — Audience & details** (two cards):

- _Email details:_ Subject (coach inline: "Add a subject line — it's the one field every recipient sees"), Preview text (helper explains where it shows), From name, From address. **From name/address PREFILL from Workspace → Communications defaults**, with a caption saying so. **Next never disables** — clicking it with a gap focuses the field and names it (toast + inline error, §3).
- _Audience:_ Include lists, Include tags, Exclude lists, Exclude tags — all as **chips + dashed suggestion chips that carry counts** ("Donors 2026 · 611"), include = primary/secondary tints, exclude = error tint. Replace the current `<select>`-then-chips pattern; disabled options with no reason are banned.
- **Estimated audience does its math in public** (the centerpiece, §1 §2): a bordered box listing every line with a number —
  `In included lists +1,284 · Matching included tags +178 · Overlap removed −88 · Excluded by lists & tags −0 · Bounced addresses skipped (Workspace setting) −62 · **Total 1,312 recipients**`.
  The bounce line reads the live Workspace `skip bounced` setting and says when it's OFF. Never show a bare unexplained count badge.

**Step 4 — Review & send.** Review card (Template, Subject, From, Audience total, Timing — every row a fact) + Send timing card (Send now / Schedule for later radios with descriptions; schedule reveals date + time inputs; missing date/time coaches on send attempt, doesn't disable).

**Footer (persistent):** `Back/Cancel · Save draft · [spacer] · Next` — on step 4 Next becomes **"Send to {N} people"** (the count IS the label). Save draft toasts "Saved draft \"{subject}\" — find it in Newsletters" and exits.

**Send preflight (required):** confirm dialog — title `Send "{subject}" now?` / `Schedule "{subject}" for {date} {time}?`, body repeats the count and the bounce skip ("It will go to 1,312 people — 62 previously bounced addresses are skipped automatically."), confirm button repeats scale again ("Send to 1,312 people" / "Schedule for 1,312 people"). Success toast: `Queued "{subject}" to 1,312 people — sending now / sending {date} at {time}`.

**Leave guard:** navigating away with any wizard edits triggers the shared guard: "Your changes to your draft newsletter — template, audience and copy — will be lost." with **Keep editing** primary.

**Type chooser:** keep Regular vs Automated-coming-soon, but the Automated card must not look 80%-clickable-dead — keep its guided exit ("Create regular newsletter") which is already correct.

---

## 2. Gaps & trust-breakers in the CURRENT flow (fix these)

Ordered by trust damage (§0: sloppy surface reads as unreliable software):

1. **Unverified sender can be typed.** `fromAddress` is a free-text input. A campaign can type any address and hit Send; delivery then fails or spoofs. Make it a **select of verified senders** (you already have `verify-sender-email-page` + sender verification flow) with a "Verify a new sender…" exit. Free-text sender is the #1 trust-breaker.
2. **No send confirmation.** `sendRegular()` fires directly from the Send button — a 1,000+-person irreversible action with zero preflight. Add the preflight above.
3. **The audience count is an unexplained number.** "Estimated Audience: 1,284 recipients" badge with no derivation. Users can't trust (or debug) a number they can't decompose — ship the math box.
4. **Send button doesn't state scale.** "Send" → "Send to {N} people". Same for the step-4 header.
5. **Silent dead steps.** Future steps get `pointer-events:none` with no affordance change or reason — a mystery non-door. Locked steps must look locked and say why (tooltip).
6. **No draft protection.** No Save draft, no leave guard — a half-built newsletter is lost on any navigation. Wire both (reuse the person-edit guard idiom).
7. **Bounce handling is invisible.** Bounced addresses are (or should be) skipped per the workspace setting, but the flow never says so — surface it in the math box and the preflight.
8. **List options disable without a reason.** Included lists become `[disabled]` options in the exclude select (and vice versa) with no explanation — switch to counted suggestion chips, where an already-used list simply isn't offered.
9. **Copy violations:** Title Case labels ("Welcome Email", "Target Audience", "From name is required."), emoji in template cards, "Next" with no object. Sentence case, icons, verb+noun throughout.
10. **Counts missing before clicks:** list/tag pickers show names without sizes. Every audience option carries its count.
11. **Validation is gate-shaped, not guide-shaped:** errors appear but nothing focuses the first problem; ensure the §3 pattern (never-disabled primary action that navigates to the gap).

## 3. Acceptance checklist

1. Every number in the math box sums to the total shown on the send button, the preflight, and the queued toast — one source.
2. From fields prefill from Workspace Communications; sender is verified-only.
3. Dark theme pass on all four steps.
4. Locked steps narrate; Next/Send never disable; every failure path coaches and exits.
5. Draft save + leave guard verified; abandoning mid-wizard can never silently lose work.
6. Screenshots in `screens/` are the layout targets (same mask-icon capture caveat as the main package).
