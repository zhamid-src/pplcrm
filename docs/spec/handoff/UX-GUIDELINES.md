# pplCRM UX Guidelines — for agents and developers

Canonical doctrine: the `pplcrm-design-principles` skill (§ references below point there). This document is the working distillation plus rulings made during the North Star prototype (`pplCRM North Star.dc.html` — open it with Design notes on; the pins are the annotated spec). When in doubt, re-read the doctrine; when the doctrine is silent, this document rules.

## 0. Beauty is the trust signal (§0)

Users infer reliability from surface care. Never ship "works but ugly" to a user-visible surface — do a smaller thing completely instead. Consistency is the whole game: the same problem is always solved the same way.

## 1. Every screen answers three questions (§1)

- **Where am I?** Title is the record's REAL name ("Amira Hassan"), never a template name ("Person Profile"). Entity type is a small uppercase eyebrow; status is a chip beside the name. Nameless records fall back to "Unnamed person" — the answer never goes blank.
- **Where was I?** Breadcrumbs are real hierarchy with real names; no fake Home crumb. Back restores the grid exactly (filters, page, scroll). The detail pager carries grid context: "4 of 43 filtered".
- **Where am I going?** Numbers before clicks, everywhere: tab labels ("Donations 12"), folders ("Open 12"), segments ("Donors 611"), bulk actions ("Send to 1,284 people"), import confirms ("Import 131 people"). All counts use `font-variant-numeric: tabular-nums`.

## 2. Disclosure over suppression (§2)

- Filter state is ALWAYS visible chips + a count sentence ("43 match your filters · 5,012 people total"). Chips are the single source of filter truth; panels and query builders are just authoring UIs that land as chips.
- **Explained-disabled**: a disabled control names its unmet condition — tooltip on desktop ("Select exactly 2 people to merge — 3 selected"), inline sub-text on touch (no hover exists). Never a bare grey button; hide it if it would mislead.
- Dirty state is narrated: "Unsaved changes · 2 fields". Selections narrate scale and offer the next scale up ("All 13 rows on this page are selected — Select all 43 matching rows").
- **No hover-only affordances.** The name is the door: record-opening text is underlined at rest (22%-opacity underline, offset 3px), primary on hover.
- Background work narrates itself: "Sync now" sits beside "Synced 2 min ago"; result toasts count what changed.
- Collapsing may hide DETAIL, never IDENTITY (collapsed rails keep the avatar; collapsed folder items keep icons + count tooltips).

## 3. Guide, don't error (§3)

Prevent (mutual exclusion with the reason: "Simple filters are active — clear them to use the query builder") → coach inline (validation as the user types; **Save never disables** — clicking it focuses the first problem) → offer the exit (every empty state = icon + cause + ONE action: "No results match these filters → Clear all filters"; "Not part of a household yet → Assign household") → fail specifically. Read-only is a surface with a reason and an exit, not a disabled input ("Addresses belong to households… Edit on household").

## 4. One idiom per job — the extended contract (§4)

| Job                           | The one idiom                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blocking decision             | ConfirmDialogService; danger variant; **safe action styled primary** ("Keep person" / "Keep editing"); body specific enough to earn the interruption (names fields/counts)           |
| Fire-and-forget feedback      | AlertService toast: max 3 stacked, duplicates coalesce with ×N badge, 3-line clamp, one clause: "Did X — consequence"                                                                |
| Empty state                   | icon + sentence naming cause + one action button. Never italic grey text                                                                                                             |
| Collapsible secondary content | quiet tab row with counts (Comments 2 · Activity 6; active = primary + 600 + 2px underline; "Hide" link only while open) — or a labeled bar for panels; pick per surface, never both |
| Multi-select filter           | checkbox picker with per-item counts; OR semantics; lands as ONE chip ("Tags: any of donor, host")                                                                                   |
| Status                        | one chip shape everywhere: 99px pill, 600 weight, semantic tint (warning=needs attention, info=in progress, success=done/good, neutral=inert)                                        |
| Bulk action confirm           | preflight naming list + count; confirm button repeats the number                                                                                                                     |
| Destructive placement         | demoted to ⋯ overflow / end of bulk bar in error color, behind the danger confirm                                                                                                    |
| Overflow actions              | ⋯ menu, labeled items with icons, dividers by group; secondary verbs (Star, Mark as unread, Print) live here, not in the first-class row                                             |
| Related action variants       | one button + menu (Reply ▾ → Reply / Reply all / Forward), not N sibling icons                                                                                                       |
| Panel collapse                | double-chevron ⟪⟫ at panel top; collapses to icon rail, never to nothing                                                                                                             |
| Touch pickers                 | bottom sheet, 44px rows, confirm repeats scale                                                                                                                                       |

**Copy:** sentence case always; verb + noun ("Save person", "Close conversation", never "Done"/"Submit"); numbers when acting on sets; tooltips are state-aware sentences.

## 5. Color: semantic tokens only (§5)

Only `--color-*` / DaisyUI semantic classes; both themes live in `styles.css` — test dark on every change. Tints and flashes via `color-mix(in srgb, var(--color-x) N%, transparent)` so they survive theme switch. Color only when it MEANS something: warning=needs attention, success=good news, error=danger, info=in progress; everything else stays base-content shades with primary icons. No decorative rainbows, no hardcoded hues — including inside keyframes.

## 6. DaisyUI first, CSS over JS (§6)

Check DaisyUI's catalog before building any widget. Motion and states in plain CSS; TypeScript only decides WHAT changed, never moves pixels (the saved-flash split: TS marks the cell, CSS animates). No @angular/animations, no JS animation libraries, no DOM measuring to animate.

## 7. Motion (§7)

House vocabulary only: `animate-up/down/left/right/drop` (0.3s ease-in-out), `animate-flash`, saved-flash (1.2s ease-out, color-mix success), `animate-spin` only while genuinely working and only behind a loading gate (`createLoadingGate`, ~300ms debounce — nothing spins on a fast response). Transitions 150–300ms, run once, animate `transform`/`opacity`/`background-color` only — never width/height/layout. One moment of motion per interaction. Ship the global `prefers-reduced-motion` guard. If you can't name the state change an animation narrates, cut it.

## 8. Typography & density

- App font is **Inter** (Google Fonts), body weight **400** — the old Roboto 300 body is retired (300 is too fragile below 14px, especially in dark mode). **Weight is hierarchy** (600–700 for headings/actives) before size or color. Monospace stays `ui-monospace` / system mono for IDs, routes, kbd hints.
- Micro-labels (eyebrows, section headers, column headers): 10–11.5px, weight 500–600, UPPERCASE, letter-spacing .04–.09em, base-content at 45–55%.
- Sidebar: headings 10.5px/500/.09em/45%; items 13px/.03em, active 600 + primary; count badges 10.5px/600 tabular-nums pills.
- Page titles 22px/700; card titles 15px/600; table text 13px; chips 10–12px/500–600.
- Tabular numerals on every count, range, and money value. Touch targets ≥44px.

## 9. Security is a surface property

URLs, titles, and copy never leak tenant IDs, internal keys, or template names. Routes use record slugs (`/people/amira-hassan`). Raw backend errors never reach the UI — translate to "what should I do now".

## 10. Ten-second litmus (§10)

Three questions answered? Anything hidden that should be narrated? Every dead end has an exit? Reused the assigned idiom? Dark theme still reads? Lowest rung (DaisyUI → CSS → TS)? Motion narrates once at house timing? Buttons read aloud as sentence-case verb+noun with honest scale?
