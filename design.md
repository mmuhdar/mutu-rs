# Design: MutuRS

The locked system. Every Hallmark run reads this first and screens share it. Change it on purpose; the file is the rule. Written by the Hallmark redesign of November 2026 (branch `desain-hallmark`).

## System
- Genre: modern-minimal
- Shape: app screen (every route; no hero, no fold, no marketing sections)
- Theme: Console, colourway graphite (deal 2/3); light mode and print use the Console colourway paper
- Axes: dark/grotesk-sans/chromatic-amber · posture: restrained

## Tokens
`src/app/tokens.css` is the source of truth (Tailwind 4 `@theme static`, so every token is a utility: `bg-paper-2`, `text-ink-3`, `border-rule-2`, `text-signal`, `bg-cool-soft`, `font-display`, `rounded-card`). Two Hallmark names are renamed because shadcn owns them: accent is `signal`, muted is `ink-3`. `src/app/globals.css` points every shadcn and older MutuRS variable (`background`, `card`, `primary`, `muted-foreground`, `success`, `danger`, `warning`, `brand`…) at these tokens, and swaps in the light "paper" colourway (one block, the `terang` variant) for light mode and print. Light mode = `data-theme="light"` on `<html>`, from the `tema` cookie the toggle in the top bar sets; the default is graphite and the OS preference is not followed. The shadcn `dark:` classes never fire (`.dark` is never set): both modes are tokens only, every text pair ≥ 4.5:1 in both.
```css
:root {
  --color-paper: oklch(17% 0.008 250);  --color-paper-2: oklch(21% 0.009 250);  --color-paper-3: oklch(13.5% 0.007 250);
  --color-ink: oklch(95% 0.005 250);  --color-ink-2: oklch(83% 0.008 250);  --color-ink-3: oklch(71% 0.01 250);
  --color-rule: oklch(31% 0.01 250);  --color-rule-2: oklch(42% 0.012 250);
  --color-signal: oklch(82% 0.15 80);  --color-signal-ink: oklch(18% 0.04 75);  --color-focus: oklch(82% 0.15 80);
  --color-cool: oklch(77% 0.12 245);  --color-ok: oklch(76% 0.15 150);  --color-bad: oklch(70% 0.17 25);  /* each with -soft and -rule */
  --font-display: Host Grotesk;  --font-body: Host Grotesk;  --font-outlier: Atkinson Hyperlegible Mono;  /* local woff2, next/font/local */
  --radius-card: 10px;  --radius-pill: 6px;  --rule-hair: 1px;  --shadow-card: none;
}
```

## Meaning (never swap)
- Amber (`signal`) is a person and the one primary control: the primary button, the current nav item, the selected segment, the step in progress, a deviation a person must act on, a name in a trail.
- Cool is an instrument: a measured value, a timestamp, a series in a chart.
- Ok and bad are status only (Tercapai / Belum Tercapai, Selesai, Terverifikasi). No third signal colour; the old category colours are gone.

## Type
- Host Grotesk 400 and 500 only (`font-semibold`/`font-bold` resolve to 500). Heads 500, tracking -0.03em, sentence case. Body 16px.
- `terukur` (Atkinson Hyperlegible Mono, tabular, slashed zero) for what the system wrote: kode Indikator, Capaian, N, D, counts in readings, timestamps. Never on a label, a head or a control. Targets are set values, not readings: body face.
- Labels, table heads, nav group labels: body face, 13 to 14px, sentence case, untracked, `text-ink-3`.

## Surfaces
- Ground `paper`; a panel is `rounded-card border border-rule bg-card` (paper-2); inputs sit on `paper-3`. No shadow, no glow, no gradient, no glass, no card inside a card.
- Panels that sit together are one surface split by 1px rules: a wrapper `overflow-hidden rounded-card border border-rule bg-rule` with `grid gap-px` and `bg-paper-2` children.
- Trails (history, steps): rows on a 1px `border-l border-rule-2` spine; person in `text-signal`, time in `terukur text-cool`, reason in ink.
- Tables: horizontal rules only, heads untracked; the first column stays pinned when the table scrolls (`Tabel`).

## Controls
- Primary: amber fill, `signal-ink` text, 6px radius, 36 to 40px high; one per screen.
- Secondary: 1px `rule-2` outline on `paper-2`, same radius and height. Links: ink, underlined in `rule-2`, amber on hover (`text-primary-ink` class).
- Chips (`Pil`): label face inside a 1px rule at 4px radius, tinted by meaning. Segments: `paper-3` track, the chosen one on `paper-2` with an amber underline.

## Copy
- Never ` · ` to join meta, never an arrow glued to a label, never a dash (–, —) in copy: commas, "s.d." for ranges, words for empty cells ("belum ada", "tidak ada"). No emoji.

## Motion
- Character: still. Colour transitions on hover at `--dur-micro`; nothing animates width, height or position; no reveal.

## Exports
`src/app/tokens.css` (Tailwind 4) and the shadcn mapping in `src/app/globals.css`.
