# Portfolio 2026 — Visual Redesign Spec

Date: 2026-06-11
Mode: autonomous (goal-directed session; decisions made without mid-task user review)

## Goal

Drastically improve the portfolio's visual quality while keeping its existing
neobrutalist aesthetic: thick black borders, hard offset shadows, the five
accent colors, Onest typography, the 3D lanyard, and the existing section
order and content.

## What stays

- Theme token system in `globals.css` (`--t-*` variables) — extended, not replaced
- Section order: nav → hero → marquee → projects → about → interests →
  achievements → why-hire-me → footer
- GitHub-driven project cards via `/api/projects`
- 3D lanyard and its context/bounce behavior
- All copy/content (light touch-ups only)

## Approaches considered

1. **Token-level restyle only** — change colors/shadows, leave markup alone.
   Too timid; doesn't satisfy "drastic".
2. **Full re-architecture with new sections/pages** — risks breaking the
   lanyard/physics and changes content scope the user didn't ask for.
3. **Chosen: deep per-section redesign on the existing skeleton** — every
   section's markup is rebuilt for visual impact, but tokens, content, and
   structure survive. Highest impact for the stated constraint.

## Design

### Global design-system layer (`globals.css`)

- Dotted "engineering paper" background on the page body; light sections go
  transparent so the dots read through. Dark sections stay solid black.
- `.nb-highlight` — sticker-style heading highlight: white text on accent,
  3px border, 4px offset shadow, slight rotation (alternate class rotates the
  other way).
- `.nb-badge` — small uppercase pill used as a section kicker ("01 — Projects").
- `.nb-card` hover physics: translate up-left, shadow grows (CSS only, no JS
  mouseenter handlers).
- Keyframes: `float` (gentle y-drift for doodles), `spin-slow` (rotating
  badge), `wiggle` (icon hover).
- Custom scrollbar (black thumb, bordered track), custom text selection
  (yellow/black), marquee pause-on-hover, skeleton shimmer for loading cards.

### Components

- **doodles.tsx (new)** — inline SVG shapes: 4-point star, sparkle, squiggle,
  ring, arrow. Used as floating decorations in hero/sections.
- **Hero** — kicker badge row ("Open to work" spinning badge), display-size
  heading with rotated sticker highlights, floating doodles, stats band
  (ETHGlobal wins, projects shipped, certifications), existing CTA buttons.
- **Navigation** — bordered "CN" monogram, scroll-aware active link pills,
  mobile hamburger menu (links are currently unreachable on mobile),
  lanyard-bounce button kept.
- **Marquee** — two crossed stripes: black stripe (existing items) plus a
  counter-rotated accent stripe with outlined text; star separators;
  pause on hover.
- **Projects** — skeleton cards while loading; cards get index numbers,
  white chip styling, hover lift+rotate; "View all on GitHub" CTA after grid.
- **About** — sticker headings, checklist items restyled as bordered tiles,
  tech-stack sticker wall (bordered pills with hover pop).
- **Interests** — kept bento; bigger icons with wiggle hover, kicker badge.
- **Achievements** — large outlined index numbers, accent top bars per card,
  hover lift on dark background, kicker badge.
- **Why hire me** — sticker quote mark, value-prop stat chips, CTA button.
- **Footer** — full footer: giant "Let's build something" headline, email CTA,
  bordered social squares (GitHub, LinkedIn, X), marquee divider, back-to-top,
  copyright.
- **layout.tsx** — real metadata (title/description).

### Error handling / loading

- Projects: skeleton grid while fetching; friendly bordered empty-state card
  if the API returns nothing.

### Testing / verification

- `npm run build` must pass (typecheck + lint via Next).
- Visual check via dev server where feasible.

## Out of scope

- New content sections (blog, newsletter), CMS, dark mode toggle,
  removing unused v0 components.
