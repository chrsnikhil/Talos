# Portfolio Design System — "CN League" (Varsity Edition)

> Canonical reference for the entire site. Theme: **90s Japanese sports-manga
> varsity** — *Slam Dunk*-era ink illustration meets retro league branding.
> Every page reads like a vintage sports-magazine spread: giant italic
> logotype as backdrop, vertical Japanese type rails, varsity lettering,
> league crests and hanko seals. Flat ink on paper. Zero gradients. Zero soft
> shadows.

**The metaphor, committed to fully:** the site is a *league* (CN League), the
developer is its *star player*. Sections are pages of the league's media
guide — cover, highlight reel, roster card, contract page, season record,
scouting report, recruiting form.

This doc has two parts: **Part A — rules & tokens**, **Part B — component
cookbook** with copy-paste examples.

---

# Part A — Rules & Tokens

## A1. Color

Defined in `app/globals.css` `:root`. **Never hardcode a hex that has a token.**

| Token | Value | Role |
|---|---|---|
| `--t-paper` | `#FBF9F4` | Paper — warm off-white, the manga page. Section backgrounds. |
| `--t-bg-card` | `#FFFFFF` | Card faces (a step brighter than paper) |
| `--t-ink` | `#101820` | Ink — borders, body text, linework |
| `--t-navy` | `#25408F` | **Royal navy** — the logotype color. Display type, shadows, structure |
| `--t-red` | `#D9251D` | **Crimson** — the team color. Kanji rails, jersey fills, energy moments |
| `--t-orange` | `#E07A1F` | Seal orange — *only* the hanko stamp & live-status dots |
| `--t-silver` | `#C7CCD4` | Chrome — rare decorative metallic. Never text. |
| `--t-text` / `--t-text-muted` | `#101820` / `#4A4F57` | Body ink / secondary ink |

### The 70/20/10 rule

Paper + ink dominate (~70%), navy is structural (~20%), red is energy (~10%)
and must stay scarce so it hits hard. **Orange appears at most once per
viewport** (one seal or one live dot). If a section feels flat, add red in a
*small* dose — a rail, one filled word, a pennant — never a full red
background unless it is the single hero moment of that section.

### Legal pairings

ink-on-paper · navy-on-paper · red-on-paper · paper-on-navy · white-on-red ·
paper-on-ink. **Never red directly on navy** (or vice versa) without a
white/paper stroke separating them — that's what the varsity treatment (§B4)
is for.

## A2. Borders, radius, shadows

| Token | Value | Notes |
|---|---|---|
| `--t-border-width` | `3px` | The universal ink rule weight |
| `--t-border-radius` | `24px` | Large cards (league-crest rounding) |
| `--t-border-radius-sm` | `12px` | Tiles, stamps |
| `--t-border-radius-pill` | `9999px` | Chips, pills |
| `--vl-shadow-sm` | `5px 5px 0 0 var(--t-navy)` | Resting card |
| `--vl-shadow` | `8px 8px 0 0 var(--t-navy)` | Default lift |
| `--vl-shadow-hover` | `12px 12px 0 0 var(--t-navy)` | Card hover |

Rules:

- Shadows are **navy**, hard (0 blur, 0 spread, positive offset) — the look of
  a misregistered two-color print run. One hero card per *page* may cast
  **red** instead.
- Every component file declares the rule once and reuses it:
  ```tsx
  const RULE = "3px solid var(--t-ink)"
  ```
- Internal divisions inside a band/table are **borders, not gaps** — cells
  share edges (`borderRight: RULE`), no margins between them.
- Responsive border swaps use arbitrary widths to stay at 3px:
  `max-md:border-t-[3px] md:border-l-[3px]`.

## A3. Typography

| Token | Font | Role |
|---|---|---|
| `--t-font-display` | **Tourney** (italic, var. weight) | The logotype. Always uppercase, weight 900, *true* italic — never synthetic skew |
| `--t-font-varsity` | **Graduate** | Collegiate block — jersey lettering |
| `--t-font-jp` | **Noto Sans JP** (700/900) | Japanese rails & accents |
| `--t-font-body` | **Onest** (500/700) | All body copy, labels, nav |
| `--t-font-mono` | JetBrains Mono | Stat tables, meta |

**Provenance** (researched against the AKAI reference): the logotype genre is
"techno-sport italic"; the canonical commercial face is *Good Times*
(Typodermic). **Tourney** (Tyler Finck, Google Fonts) is the free equivalent —
chamfered corners, weight to Black, real italic axis. **Graduate** is the
collegiate block for jersey lettering. Loaded in `app/layout.tsx` via
`next/font/google`.

### Scale & rules

| Use | Spec |
|---|---|
| Backdrop logotype | `.vl-backdrop-type`, `clamp(80px,18vw,300px)`+, `leading-[0.8]`, solid navy — *never faded* |
| Section heading (h2) | `.vl-display`, `clamp(40px,7vw,96px)`, navy or ink |
| Varsity word | `.vl-varsity` inside `.vl-varsity-wrap` — one per section max |
| Vertical JP rail | `.vl-rail-vertical`, red (primary) or navy (secondary) |
| Body copy | Onest `text-sm md:text-[15px] font-medium leading-relaxed`, muted |
| Labels / nav / kickers | Onest `text-xs font-extrabold uppercase tracking-[0.18em]` |
| Meta strips | `text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.22em]` |
| Stamp text | `text-[7px–10px] font-extrabold uppercase tracking-[0.12em]` |

Two opposing laws: **labels** are uppercase + wide-tracked (smaller text →
wider tracking); **display type** is tight (`leading-[0.8–0.86]`) and leans
forward (the italic *is* the speed of the theme). Body stays quiet so display
work can shout. Muted text is `#4A4F57` or `text-black/35` — inky, never a
washed gray.

## A4. Structural grammar — the cover composition

Sections are **full-bleed compositions**, not centered boxes:

```
┌─┬──────────────────────────────────────────┬─┐
│V│   GIANT ITALIC LOGOTYPE (navy, z-0,       │V│
│E│   bleeds off-canvas, BEHIND content)      │E│
│R│        ┌──────────────────┐               │R│
│T│        │  content layer   │   crest ▣     │T│
│ │        │  (z-10, overlaps │   seal  ◉     │ │
│R│        │   the type)      │   sig   ✍     │R│
│A│        └──────────────────┘               │A│
│I│                                           │I│
│L│                                           │L│
├─┴───────────────────────────────────────────┴┤
│  BASELINE STRIP (ink rule · meta · credits)   │
└───────────────────────────────────────────────┘
```

1. **Type is architecture.** One giant display word per major section, navy,
   z-0, behind content, may bleed off edges (section gets `overflow-hidden`).
2. **Vertical rails** on one or both edges (`writing-mode: vertical-rl`).
   Primary rail red katakana, secondary navy kanji. Collapse to a horizontal
   kicker on mobile. Decorative only — `aria-hidden`.
3. **Depth = z-stacking**, not background texture: backdrop type (z-0) →
   content (z-10) → badges/seals (z-20). Paper is clean `--t-paper`.
4. Sections share single `3px` ink rules at their edges (`borderBottom` on
   each section) forming one continuous line down the page.
5. Edge content inset: `px-5 md:px-12` — identical in every section so
   everything lines up. Section vertical padding: `py-20 md:py-28`.

### Section ↔ media-guide map

| # | Section | Backdrop word | JP rail | Guide page |
|---|---|---|---|---|
| — | Hero | `CHRIS` | クリス / 赤い伝説 | Cover |
| 01 | Projects | `WORKS` | ワークス / 作品集 | Highlight reel |
| 02 | About | `PLAYER` | プレイヤー / 選手紹介 | Roster card |
| 03 | Career | `PRO` | プロ / 現役 | Contract page |
| 04 | Interests | `OFF DAY` | 趣味 | Off-season |
| 05 | Achievements | `WINS` | 優勝 / 戦績 | Season record |
| 06 | Pitch | `SCOUT` | 偵察 | Scouting report |
| — | Footer | `DRAFT ME` | 契約 | Recruiting page |

## A5. Interaction physics

The mental model: **cards come toward you, buttons go away from you, seals
stamp down.** Shadow grows on lift, vanishes on press. All physics are CSS
classes — never JS mouseenter handlers.

| Element | Behavior | Class |
|---|---|---|
| Rail/nav cell (welded into a band) | Ink invert: `hover:bg-[var(--t-ink)] hover:text-[var(--t-paper)]` | utility classes |
| Free-standing card | Lift `translate(-4px,-4px)`, navy shadow grows | `.vl-card` |
| Button | Press `translate(4px,4px)`, shadow collapses to 0 | `.vl-btn` |
| Chip / sticker | Lift + tilt `rotate(-2deg)` | `.nb-chip` (restyle → `.vl-chip`) |
| Hanko seal | Stamp-down `scale(0.92)` | `.vl-seal` |
| Backdrop type | Optional ≤40px parallax drift at 0.9× scroll | rAF, reduced-motion-guarded |

Lift easing: springy `cubic-bezier(0.34, 1.56, 0.64, 1)`. Press: `0.15s ease`.

**Scroll reveal** is unchanged: wrap entering content in `.scroll-reveal`
(or `-left/-right/-scale`) + `.scroll-delay-1..6`; the `useScrollReveal` hook
flips `data-visible`. House default is the plain `translateY` variant.

## A6. Voice & copy

Sports-legend hype, terse, slightly wry. English carries all information; JP
carries atmosphere only.

- "Red Legend." · "Season record: 4–0." · "Drafted by Tenorilabs, 2026." ·
  "Active roster" · "Scout's notes" · "Signed & sealed."
- Dates as seasons: "Season 2026", "EST. 2026", `'26`.
- Numbers as jersey stats: `№ 10`, `4×`, `01`.

## A7. Accessibility & motion

- All JP text and backdrop words: `aria-hidden="true"` + `select-none`.
  Real headings are semantic English (use `sr-only` h-tags or `aria-label`
  when the visual heading is fragmented/decorative).
- Contrast pairs in A1 pass AA at the sizes used. Silver is decorative-only.
- Every looping/parallax animation must no-op inside the
  `prefers-reduced-motion` guard in globals.css.
- Async content always has a `.nb-skeleton` (→ `.vl-skeleton`) state.
- Subset Noto Sans JP to used glyphs where possible (next/font `text` option).

---

# Part B — Component Cookbook

Working examples against the classes that exist in `app/globals.css` today.
`RULE = "3px solid var(--t-ink)"` is assumed in scope.

## B1. Section shell

Every non-hero section starts from this skeleton:

```tsx
<section
  id="about"
  ref={sectionRef}
  className="relative overflow-hidden py-20 md:py-28"
  style={{ borderBottom: RULE, background: "var(--t-paper)" }}
>
  {/* z-0 · backdrop word */}
  <div
    aria-hidden="true"
    className="vl-backdrop-type absolute -top-4 -left-[0.05em] z-0 text-[clamp(90px,20vw,320px)]"
  >
    Player
  </div>

  {/* z-20 · vertical rail (right edge) */}
  <span
    aria-hidden="true"
    className="vl-rail-vertical hidden lg:block absolute right-8 top-24 z-20 text-4xl"
    style={{ color: "var(--t-red)" }}
  >
    選手紹介
  </span>

  {/* z-10 · content */}
  <div className="relative z-10 px-5 md:px-12">
    {/* kicker + heading + body … */}
  </div>
</section>
```

## B2. Section kicker + heading

The numbered kicker is a bordered tag (not a rounded pill — squared, like a
ticket stub), followed by the display heading:

```tsx
<div className="flex items-center gap-3 mb-6">
  <span
    className="px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em]"
    style={{ border: RULE, background: "var(--t-bg-card)", color: "var(--t-ink)", boxShadow: "var(--vl-shadow-sm)" }}
  >
    02 — Roster
  </span>
  <span aria-hidden="true" className="text-sm font-black" style={{ fontFamily: "var(--t-font-jp)", color: "var(--t-red)" }}>
    選手
  </span>
</div>

<h2 className="vl-display text-[clamp(40px,7vw,96px)] leading-[0.85] mb-8" style={{ color: "var(--t-navy)" }}>
  The Player
</h2>
```

## B3. Backdrop logotype (`.vl-backdrop-type`)

Already styled in CSS (Tourney 900 italic, navy, `leading-[0.8]`, nowrap,
non-interactive). Positioning patterns:

```tsx
{/* spanning the top, centered, cropped both sides (hero style) */}
<div aria-hidden="true" className="vl-backdrop-type absolute top-2 left-1/2 -translate-x-1/2 z-0 text-[clamp(110px,27vw,460px)]">Chris</div>

{/* anchored to a corner, bleeding off-canvas (section style) */}
<div aria-hidden="true" className="vl-backdrop-type absolute -bottom-8 -right-6 z-0 text-[clamp(80px,16vw,260px)]">Wins</div>
```

**Solid is for the hero only** — where the character art covers the word. In
every *content* section the heading and copy sit near the backdrop, so a solid
word collides and reads cluttered. Content sections therefore always use the
`.vl-outline` variant (stroke-only), positioned bleeding off one side so it
echoes *behind* the heading rather than stacking on it (see the Player/Works
sections). Never lower opacity to tame it — switch to outline:

```tsx
<div aria-hidden="true" className="vl-backdrop-type vl-outline absolute …">Works</div>
```

## B4. Varsity lettering (`.vl-varsity`)

The jersey treatment — Graduate font, red fill, navy stroke, white separation
ring. The wrapper duplicates the text in a wide white stroke via `::before`:

```tsx
<span className="vl-varsity-wrap text-5xl md:text-7xl" data-text="4×">
  <span className="vl-varsity">4×</span>
</span>
```

One varsity word per section, max. Use for: jersey numbers, the `4×` record,
a single championship word ("CHAMPION", "WINNER").

## B5. League crest (`<LeagueCrest />`)

Navy rounded square, ink border, white inner keyline, italic CN mark:

```tsx
<div className="vl-card w-20 rounded-xl p-[5px]" style={{ background: "var(--t-navy)", borderColor: "var(--t-ink)" }}>
  <div className="rounded-lg border-2 border-white flex flex-col items-center justify-center py-2.5 gap-0.5">
    <span className="vl-display text-2xl text-white leading-none">CN</span>
    <span className="text-[7px] font-extrabold uppercase tracking-[0.3em] text-white">League</span>
  </div>
</div>
```

Used in: hero right rail, footer. Extract to `components/league-crest.tsx`
once a third caller appears.

## B6. Hanko seal (`.vl-seal`)

Orange stamp, the only orange on the viewport. Stamp-down hover:

```tsx
<div className="vl-seal w-20 rounded-lg p-[4px]" style={{ background: "var(--t-orange)", border: "2px solid var(--t-ink)" }}>
  <div className="rounded-md border border-white/80 flex flex-col items-center justify-center py-2 gap-0.5 text-white">
    <span className="text-[7px] font-extrabold uppercase tracking-[0.12em]">CN Spirit</span>
    <span className="text-[11px] font-black" style={{ fontFamily: "var(--t-font-jp)" }}>心・技・体</span>
    <span className="text-[7px] font-extrabold uppercase tracking-[0.12em]">Est. 2026</span>
  </div>
</div>
```

Variant: use as an "approval stamp" rotated `-6°` on top of a signed
card (career/contract section) — like a stamped document.

## B7. Card (`.vl-card`)

White face, ink border, navy plate shadow, lift on hover:

```tsx
<article className="vl-card bg-white p-6 md:p-8 relative overflow-hidden" style={{ borderRadius: "var(--t-border-radius)" }}>
  {/* oversized outlined jersey number watermark */}
  <span aria-hidden="true" className="vl-display vl-outline absolute -bottom-5 -right-2 text-[110px] leading-none opacity-40 select-none pointer-events-none">
    01
  </span>
  {/* content … */}
</article>
```

The page's single proudest card may use the red plate:
`style={{ boxShadow: "8px 8px 0 0 var(--t-red)" }}`.

## B8. Buttons (`.vl-btn`)

Buttons are **sharp** — `.vl-btn` sets `border-radius: 0` so they read as
crisp rectangles matching the chips and badges. Do **not** add a `borderRadius`
to a button's inline style. (Cards stay rounded at `--t-border-radius`; the
sharp-button / rounded-card contrast is intentional.)

```tsx
{/* Primary — team-red CTA */}
<a href="…" className="vl-btn inline-flex items-center gap-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white"
   style={{ background: "var(--t-red)", borderColor: "var(--t-paper)" }}>
  <Mail className="w-4 h-4" /> Draft me
</a>

{/* Secondary — paper */}
<a href="…" className="vl-btn inline-flex items-center gap-2 px-8 py-4 text-sm font-extrabold uppercase tracking-[0.14em]"
   style={{ background: "var(--t-bg-card)", color: "var(--t-ink)" }}>
  <Github className="w-4 h-4" /> Github
</a>

{/* Tertiary — navy block */}
<a href="…" className="vl-btn …" style={{ background: "var(--t-navy)", color: "#fff" }}>Resume</a>
```

One red button per section. Press physics come from `.vl-btn`; never add
custom hover transforms on top.

## B9. Chip / roster tag

Squared ticket-stub chips (replacing the rounded `nb-chip` look as sections
migrate):

```tsx
<span
  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em]"
  style={{ border: "2px solid var(--t-ink)", background: "var(--t-bg-card)", color: "var(--t-ink)", boxShadow: "3px 3px 0 0 var(--t-navy)" }}
>
  Solidity
</span>
```

Active/selected variant: navy fill, white text.

## B10. Stat cell / record banner

The proudest metric, varsity-treated on a pennant block:

```tsx
<div className="flex flex-col items-center px-8 py-6" style={{ background: "var(--t-red)", border: RULE }}>
  <span className="vl-varsity-wrap text-6xl" data-text="4×">
    <span className="vl-varsity" style={{ color: "#fff", WebkitTextStroke: "2.5px var(--t-navy)" }}>4×</span>
  </span>
  <span className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-white">ETHGlobal Champion</span>
</div>
```

## B11. Live-status dot

Orange ping — pairs with "Active roster" / "Current role":

```tsx
<span className="relative flex h-2.5 w-2.5">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--t-orange)" }} />
  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--t-orange)" }} />
</span>
```

## B12. Scoreboard row

For tabular data (achievements list, project meta) — cells welded with shared
borders, mono numerals:

```tsx
<div className="grid grid-cols-[80px_1fr_auto] items-stretch" style={{ border: RULE, background: "var(--t-bg-card)" }}>
  <div className="flex items-center justify-center text-sm font-black px-3 py-4" style={{ borderRight: RULE, background: "var(--t-navy)", color: "#fff", fontFamily: "var(--t-font-mono)" }}>
    2026
  </div>
  <div className="px-4 py-4 font-bold" style={{ color: "var(--t-ink)" }}>ETHGlobal HackMoney — Winner</div>
  <div className="flex items-center px-4 text-xs font-extrabold uppercase tracking-[0.18em]" style={{ borderLeft: RULE, color: "var(--t-red)" }}>
    W
  </div>
</div>
```

Stack rows with `marginTop: "-3px"` (shared edges) or in a bordered parent
with `divide`-style internal rules.

## B13. Baseline strip

Thin meta line that closes a section:

```tsx
<div className="flex items-center justify-between gap-4 px-5 md:px-12 py-3 text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.22em]"
     style={{ borderTop: RULE, background: "var(--t-paper)", color: "var(--t-ink)" }}>
  <span>Section 02 — Roster</span>
  <span className="hidden md:inline" style={{ color: "var(--t-navy)" }}>CN League · Season 2026</span>
  <span style={{ color: "color-mix(in srgb, var(--t-ink) 40%, transparent)" }}>13.0827° N, 80.2707° E</span>
</div>
```

## B14. Speed lines (`.vl-speedlines`)

Manga motion texture — clipped block, ≤2 uses on the whole page:

```tsx
<div aria-hidden="true" className="vl-speedlines absolute inset-y-0 right-0 w-1/3 pointer-events-none" />
```

## B15. Skeleton

Loading shimmer (mechanics unchanged from `.nb-skeleton`):

```tsx
<div className="nb-skeleton h-8 w-3/4 mb-6" />
```

## B16. Signature

The artist's mark, pinned bottom-right of a section:

```tsx
<span aria-hidden="true" className="absolute bottom-3 right-6 z-20 text-lg italic pointer-events-none"
      style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", color: "var(--t-ink)" }}>
  C.Nikhil &rsquo;26
</span>
```

---

## Build checklist (per section)

- [ ] `RULE` declared & reused; every border `3px` ink.
- [ ] One navy backdrop word, z-0, `aria-hidden`, section `overflow-hidden`.
- [ ] Vertical JP rail on ≥1 edge (decorative; collapses on mobile).
- [ ] 70/20/10 held; orange = one seal/dot max; red never touches navy bare.
- [ ] Shadows navy, hard, 0-blur (red only on the page's one hero card).
- [ ] Display = Tourney 900 italic via `.vl-display`; one `.vl-varsity` word max.
- [ ] Edge inset `px-5 md:px-12`; section padding `py-20 md:py-28`.
- [ ] Physics via `.vl-card` / `.vl-btn` / `.vl-seal` — no JS hover handlers.
- [ ] Crest *or* seal *or* signature pinned — not all three.
- [ ] English carries all info; JP decorative + `aria-hidden`.
- [ ] Async → skeleton; new loops → reduced-motion guard.
