# Section Redesign — CN League Media Guide

> Companion to `DESIGN_SYSTEM.md`. This doc redesigns **every section except
> the hero** into the varsity-league theme. Each spec lists: the concept, the
> exact data it reuses (nothing invented), the layout, and the interactions.
> Build order is bottom of the doc.

Global rules apply to all sections (see design system): paper bg, one navy
backdrop word at z-0, JP rail, `RULE = "3px solid var(--t-ink)"`, navy
shadows, `px-5 md:px-12` insets, scroll-reveal entrances, JP text decorative
only.

---

## 1. Marquee → **The Jumbotron Ticker**

*Current:* two rotated stripes (yellow mantra reverse-scrolling, black skills
forward-scrolling), scroll-driven rAF velocity, hover slows to 0.12×.

**Concept.** An arena jumbotron / stadium LED ticker between the cover and
the highlight reel. Keep the excellent scroll-driven motion engine *exactly
as is* — restyle the stripes only, and drop the rotation to 0° (the hero
already leans; the ticker should feel like a stadium fascia board, dead
level, full-bleed).

**Data (unchanged):**
- Skills: Sui, Bitcoin, Ethereum, NextJS, Solidity, TypeScript, Fullstack
  Development, Editing, VideoGraphy (with existing react-icons)
- Mantra: Build · Ship · Iterate · Win Hackathons · Stay Curious · Lift
  Heavy · Repeat

**Layout.**
- Top stripe — "league announcements": **red** band, white text, JP
  interleave: every word pair separated by a small white ★ and its katakana
  echo rendered in Noto Sans JP 700 at 60% size (`ビルド`, `シップ`… optional,
  decorative). Reverse direction (as now).
- Bottom stripe — "starting lineup": **navy** band, paper-white skill
  entries. Each skill is `ICON + NAME` set in `.vl-display` (Tourney italic)
  — like sponsor logos on an arena board. Hover inverts the entry to
  white-on-red (was yellow inversion).
- Both bands bordered top+bottom with `RULE`; bands touch (shared 3px rule
  between them), no rotation, no offset box-shadow.
- Separator glyph: replace `FaStar` with a small basketball glyph or ★ in
  `--t-silver` on navy / white on red.

**Interactions.** Engine untouched (scroll velocity, hover-to-read,
reduced-motion early-return already correct).

---

## 2. Projects → **The Highlight Reel** (01 — WORKS)

*Current:* GitHub API fetch via `/api/projects`, 6 skeletons while loading,
accent-colored rounded cards with index watermark, topics chips, language /
license / stars / forks / pushed_at meta, "Get in touch" card, "View all
repositories" CTA.

**Concept.** Each repo is a **game card** in the season's highlight reel —
white trading-card faces with a navy plate shadow, jersey-number watermark,
and a "box score" footer. No more per-card accent backgrounds (that was the
old 5-accent system): cards are white; **red appears only as the "W" win
chip and link hovers**.

**Data (unchanged):** everything from the `Project` interface — name,
description, html_url, homepage_url, pushed_at, language + language_color,
stargazers_count, forks_count, license, topics (cap 5). Email CTA
`chrsnikhil@gmail.com`; repos link `github.com/chrsnikhil?tab=repositories`.

**Layout.**
- Section shell: backdrop word `WORKS` bleeding off the top-left; right rail
  ワークス (red). Kicker `01 — Highlight Reel`.
- Grid `md:grid-cols-2 lg:grid-cols-3 gap-7` (keep), each card:
  - **Header bar** welded to the card top (`borderBottom: RULE`): left —
    repo name in `.vl-display` ink, sized down to `text-xl`; right — a navy
    square "GAME 01" chip (index, mono).
  - Body: description (3-line clamp), then topic chips as squared ticket
    stubs (§B9).
  - **Box-score footer** (`borderTop: RULE`, `grid-cols-4`, cells sharing
    3px rules — a real scoreboard): `★ stars` · `⑂ forks` · `LANG` (dot in
    language_color kept) · `pushed_at` ("2mo ago" format kept). Mono font,
    centered cells.
  - Watermark: `.vl-display .vl-outline` index `01…` bottom-right.
  - Links: Globe/Arrow buttons become two welded cells on the header bar's
    right edge — square, ink border, invert-on-hover.
- **Get-in-touch card** becomes the **"FREE AGENT" card**: navy face, white
  inner keyline (crest language), `.vl-varsity` word "OPEN" — copy kept:
  "Looking for a developer? Get in touch with me!" + red `Draft me` button
  (mailto link unchanged).
- Below grid: secondary paper button "View all repositories" (unchanged
  link), plus baseline strip `Section 01 — Highlight Reel · CN League`.

**Loading state.** Keep 6 `.nb-skeleton` cards, restyled to the new card
frame (white face, navy plate).

---

## 3. About → **The Roster Card** (02 — PLAYER)

*Current:* circular portrait tile (about-me.svg) + "Why do I do all of
this?" blurb, 2 highlight tiles (Web3 & Fullstack Expert / Smart Contract
Specialist), 10 tech-stack chips, LinkedIn CTA.

**Concept.** A single oversized **player roster card** — the kind printed in
a team's media guide. One big horizontal card split into a photo panel and a
stats panel, instead of the loose two-column layout.

**Data (unchanged):** the belief blurb ("I believe in the power of
decentralization…"), both highlight items verbatim, techStack: Solidity,
Move, TypeScript, Next.js, React, Three.js, Tailwind, Node.js, Python, SQL.
LinkedIn URL unchanged. Portrait: `/images/about-me.svg` (until real art).

**Layout.**
- Shell: backdrop word `PLAYER` (outline variant — this section is text-
  dense); left rail 選手紹介 (navy). Kicker `02 — Roster`.
- One `vl-card` `md:grid-cols-[340px_1fr]`, radius 24, navy plate:
  - **Photo panel**: portrait on red background, `borderRight: RULE`;
    bottom strip inside the panel — varsity `№ 10` + "CHRIS NIKHIL" in
    Graduate, white on red (jersey-back look).
  - **Stats panel**:
    - Header row (welded): `POSITION: Fullstack / Web3` ·
      `HOMETOWN: Chennai, IN` · `STATUS: Active` (orange dot) — three cells
      sharing rules, label style.
    - The belief blurb as "Scout's notes:" body copy.
    - The two highlight items as **attribute rows**: navy square bullet +
      bold title + description (replaces nb-card tiles — they're rows inside
      the card now, separated by 2px ink hairlines).
    - "TOOLS I REACH FOR" label + the 10 chips as squared roster tags
      (§B9), wrap.
    - Footer row (`borderTop: RULE`): LinkedIn button (navy, `.vl-btn`,
      "Connect on LinkedIn") right-aligned; signature `C.Nikhil '26` left.

---

## 4. Career → **The Contract** (03 — PRO)

*Current:* Tenorilabs logo tile on yellow panel + role card: "Current role"
badge, "2026 — Present" pill, "AI FullStack Engineer @ Tenorilabs", blurb,
5 focus-area chips.

**Concept.** A **signed professional contract** — a document card with a
letterhead, terms, signature line, and the orange hanko stamped over the
corner at an angle. This is the natural home of the seal (the one orange
allowed in this viewport).

**Data (unchanged):** title "AI FullStack Engineer @ Tenorilabs",
"2026 — Present", the blurb ("Building AI-powered products end to end…"),
focus areas: AI Agents, LLM Pipelines, Next.js, TypeScript, Product
Engineering. Logo `/logos/tenori-logo.png`.

**Layout.**
- Shell: backdrop word `PRO` huge (3 letters → can run very large behind);
  rail 現役 ("active duty", red). Kicker `03 — Contract`.
- One centered document card (`max-w-4xl`, white, navy plate, radius 12 —
  documents are squarer than trading cards):
  - **Letterhead** (`borderBottom: RULE`): Tenorilabs logo (black PNG on
    white tile, kept) left · "PLAYER CONTRACT" in `.vl-display` navy right.
  - **Terms block**: rows of `label: value` pairs sharing hairlines —
    `ROLE:` AI FullStack Engineer · `CLUB:` Tenorilabs · `TERM:` 2026 —
    Present (with orange live dot) · `POSITION:` the blurb as the "duties"
    clause.
  - **Focus areas** as contract riders: the 5 chips in a row labeled
    `RIDERS:`.
  - **Signature strip** (`borderTop: RULE`): ruled line + script
    `C.Nikhil '26` … and the **hanko seal stamped at `rotate(-8deg)`**
    overlapping the strip's top-right corner (z-20) — "signed & sealed."

---

## 5. Interests → **Off-Day Program** (04 — OFF DAY)

*Current:* 6-tile bento (Web3 & DeFi ×2span, Open Source, Content Creation
×2row, Fitness, Gaming, Continuous Learning ×2span) with JS hover
background-swap handlers.

**Concept.** The league's **off-day training program** — keep the bento
silhouette (it's good) but weld it into one bordered board where tiles share
3px rules (true table, `gap-[3px]` over an ink background kept), and replace the
five-accent hover chaos with one navy system. **Kill the JS hover handlers**
— pure CSS now (design-system law).

**Data (unchanged):** all 6 interests, titles + descriptions + icons +
spans, exactly as in `interests-section.tsx`.

**Layout.**
- Shell: backdrop word `OFF DAY` bottom-right; rail 趣味 (navy). Kicker
  `04 — Off-Day Program`.
- The board: ink-bg parent + `gap-[3px]` grid (current trick kept — it draws
  the shared rules), tiles white.
- Tile anatomy: top-left a **drill number** `D-01…D-06` (mono, navy) instead
  of colored icon squares; icon inline with the title, ink; description
  muted.
- Hover (CSS only): tile inverts to **navy**, text to paper, icon to silver
  (`hover:bg-[var(--t-navy)]` group classes). One tile — Fitness ("Lift
  Heavy" is in the mantra) — gets the red hover as the section's energy
  moment.

---

## 6. Achievements → **Season Record** (05 — WINS)

*Current:* black section, sticky left intro ("Four ETHGlobal wins and
counting…", resume button), 6 cards with accent ribbons, outlined index,
date pills, org icons.

**Concept.** The trophy wall: **navy section** (the league's home colors —
this is the one full-navy band on the page), sticky left column with the
record, and the achievements as a **W–L season table** of scoreboard rows
(§B12) — every result is a W. More confident than cards: a record you read
down like standings.

**Data (unchanged):** all 6 entries verbatim (Open Agents/ZW.ARM 2026,
HackMoney/cybersecurity 2026, X Spaces Nov 2025, ETH Online/ViVault Oct
2025, ETH New Delhi/World Mini Kit Sep 2025, Google Advanced Data Analytics
May 2025) + org icons + resume PDF link.

**Layout.**
- Section: `background: var(--t-navy)`, ink rules become **paper-colored**
  rules here (3px `#FBF9F4`) — inverted print. Backdrop word `WINS` in
  paper at 12% opacity is the one allowed "faded" exception… **no** — per
  system law backdrop type is never faded: use `.vl-outline` with white
  stroke instead. Rail 戦績 ("battle record", paper).
- Left sticky column: kicker `05 — Season Record`, heading "Take a look at
  my achievements" → reworded display: `SEASON RECORD` + varsity stat
  banner `4×` (§B10, red pennant — legal: white-stroked). Blurb kept
  verbatim. Resume button: paper face, red plate shadow ("See full resume",
  same PDF link).
- Right: 6 **scoreboard rows**, stacked sharing rules:
  `[period | org icon | title + description (expandable) | W]` — the `W`
  cell red with white W in Graduate; the Google cert row gets `CERT`
  instead of `W` (honesty in the metaphor).
  - Rows are white faces on the navy field; description shows on
    `md+` always, clamps on mobile.
  - Row hover: lifts with **paper** plate shadow.

---

## 7. Pitch → **Scouting Report** (06 — SCOUT)

*Current:* "Why you should hire me?" heading, 3 value chips (Ships fast /
Communicates clearly / Product-first mindset), big quote card with yellow
quote mark + portrait circle.

**Concept.** A **scout's evaluation sheet** on the player — typed report
card with rated attributes and a verdict stamp. The quote becomes the
scout's summary paragraph; the 3 values become graded attributes.

**Data (unchanged):** the pitch paragraph ("I combine deep technical
expertise…"), the 3 values + icons, "Ready to build? / Let's create
something exceptional."

**Layout.**
- Shell: paper again (recovery beat after the navy block). Backdrop `SCOUT`
  top-right; rail 偵察 (red). Kicker `06 — Scouting Report`.
- One document card (`max-w-4xl`, radius 12, like the contract — reports and
  contracts are siblings):
  - Letterhead: `CONFIDENTIAL — SCOUTING REPORT` label + `SUBJECT: C.
    NIKHIL` mono.
  - **Attribute rows** (one per value): icon cell · attribute name ·
    **grade cell** `A+` in Graduate red — welded `grid-cols-[48px_1fr_64px]`
    rows.
  - Scout's summary: the pitch paragraph in body type, with "Ready to
    build? / Let's create something exceptional." as the sign-off.
  - **Verdict stamp**: red bordered text stamp `DRAFT IMMEDIATELY` rotated
    `-6°` overlapping the card's bottom-right (outline-text style, like an
    ink stamp — not a filled block).

---

## 8. Footer → **Draft Me** (— RECRUITING)

*Current:* black footer, "Let's build something stunning", email CTA,
3 social squares, back-to-top, copyright line.

**Concept.** The recruiting page / back cover: **ink-black section** (the
single black band, bookending the navy one), dominated by the biggest
display setting on the page after the hero: `DRAFT ME`.

**Data (unchanged):** email `chrsnikhil@gmail.com` (gmail compose link),
socials GitHub/LinkedIn/X (urls kept), back-to-top `#home`, copyright
"Built with Next.js, caffeine, and hard shadows."

**Layout.**
- `background: var(--t-ink)`; rules in paper.
- Center: kicker `Got an idea?` (paper tag) → giant `.vl-display` `DRAFT
  ME` in **red with white stroke ring** (the page's closing varsity moment;
  replaces "Let's build something stunning" as the visual — keep that line
  as the subhead beneath it: "Have a project in mind, a hackathon to win,
  or just want to talk Web3? My inbox is always open.").
- CTA row: red `.vl-btn` email button + the 3 socials as welded square
  cells in one bordered strip (shared rules, invert on hover) — not three
  floating squares.
- **League crest** (paper-on-ink variant) centered below, with the JP rail
  contract glyph 契約 beside it.
- Baseline: copyright (kept, year dynamic) · `CN LEAGUE — SEASON 2026` ·
  back-to-top pill.

---

## Page rhythm (color score)

```
HERO        paper   (cover)
TICKER      red + navy bands (energy burst)
01 WORKS    paper   (white cards)
02 PLAYER   paper   (one big card, red photo panel)
03 PRO      paper   (document + orange seal)
04 OFF DAY  paper   (navy board hovers)
05 WINS     NAVY    (the home-colors block)
06 SCOUT    paper   (recovery, red stamp)
FOOTER      INK     (black back cover, red DRAFT ME)
```

Paper dominates; navy gets one full section; ink gets one; red never gets a
full section — it stays the energy color throughout. Orange appears exactly
twice on the page: hero seal, contract seal (different viewports).

## Build order

1. **Ticker** (smallest, engine already done — pure restyle)
2. **Projects** (highest traffic; establishes card + box-score patterns)
3. **About** (roster card; establishes document-panel patterns)
4. **Career** (contract; reuses document pattern + seal)
5. **Achievements** (navy section + scoreboard rows)
6. **Pitch** (report; reuses document + stamp)
7. **Interests** (board rework, kill JS hovers)
8. **Footer** (closing varsity moment)

Per-section definition of done = the checklist at the end of
`DESIGN_SYSTEM.md`.
