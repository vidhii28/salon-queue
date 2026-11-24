# AGENTS.md: Salon Queue Management

Queue app for a salon: customers join from their phone, see wait time
and get called; reception and barbers manage the queue; TV display.

## Read first
- docs/01-brief.md -> features + what NOT to build
- docs/02-screens.md -> every screen's layout and behaviour
- docs/03-flows-rules.md -> flows, queue rules, test checklist

## Stack
React + Vite + Tailwind CSS. Run with `npm run dev`.
Choose the simplest storage that keeps phone, tablet and TV in sync
(explain your choice before using it).
Hosting: Vercel (frontend); Render or Railway only if a backend is needed.
Live link must be the first line after the title in README.md.

## How to work
- One screen or one feature per task. Don't touch other screens.
- Theme: charcoal (#1F2937) + gold (#D4A017); rounded cards.
- All labels via the EN/GU language file; no hard-coded text.
- Queue rules live in ONE place in the code; reuse them everywhere.
- Never add features from the "Don't build" list.
- After each task: list changed files and how to test the change.