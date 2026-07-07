# Spec package — index

Vendored source-of-truth documents for the PeopleCRM full-spec build-out. The
implementation task breakdown (Fable 5, July 6 2026) dispatches tasks against
these files. **Do not edit these documents to match the code** — they are the
reference the code is measured against.

## Binding rulings

1. **Prototype unavailable → PDF strings win.** The spec's stated source of
   truth, `PeopleCRM North Star.dc.html`, is not on disk. Wherever the spec
   says "the prototype wins," the quoted strings in `PeopleCRM Full Spec.pdf`
   are the binding copy instead. Companion markdown files fill in detail; when
   neither gives a string, follow `handoff/UX-GUIDELINES.md` copy grammar and
   flag it.
2. **`.dc.html` files are self-contained HTML.** Open them in a browser, or
   read the raw markup, to extract copy strings. `doc-page.js` and `support.js`
   are the viewer scripts those HTML docs load — not spec content themselves.

## Documents

| Path                               | Spec § it serves                       | Notes                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PeopleCRM Full Spec.pdf`          | **all**                                | Master spec, July 5 2026. Quoted strings are binding copy.                                                                                                                                                                                           |
| `handoff/UX-GUIDELINES.md`         | §1 (global idioms)                     | The idiom rulebook — copy grammar, house idioms. T2.1 companion.                                                                                                                                                                                     |
| `handoff/IMPLEMENTATION.md`        | §2 dashboard, §3/§5 inbox, §2–4 people | Deep-dive implementation detail for the done/verify areas.                                                                                                                                                                                           |
| `handoff/FORMS-PLAN-FOR-OPUS.md`   | §10 forms                              | Forms "living funnel" plan. T2.5 companion.                                                                                                                                                                                                          |
| `handoff/DIRECTION-FOR-OPUS.md`    | general direction                      | Overall build direction/context.                                                                                                                                                                                                                     |
| `handoff-newsletter/NEWSLETTER.md` | §11 newsletters                        | Newsletter list + send-pipeline detail. T3.8 / T3.9 companion.                                                                                                                                                                                       |
| `handoff-sweep/IMPLEMENTATION.md`  | §1 / §22 sweep                         | Acceptance-sweep & idiom detail. T2.1 companion.                                                                                                                                                                                                     |
| `Deliveries Spec.dc.html`          | §14 deliveries                         | Self-contained HTML design/behavior ref. T4.1 companion.                                                                                                                                                                                             |
| `handoff-yardsigns/img/*`          | §14 deliveries                         | 8 prototype screenshots (requests grid, plan routes, route detail, volunteer pages). T4.2 / T4.3 reference.                                                                                                                                          |
| `handoff-gap/`                     | delta-audit (multiple §)               | **⚠ Stale-prone.** The "Gap Direction" delta-audit (`IMPLEMENTATION.md`, `UX-GUIDELINES.md`, `screens/`). Verify each claim against the current code before acting — prior gap-audits went stale when concurrent sessions had already done the work. |
| `doc-page.js`, `support.js`        | —                                      | Viewer scripts for the `.dc.html` docs. Not spec content.                                                                                                                                                                                            |
