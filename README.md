# Salon Queue Management System

**Live demo:** <your-vercel-link>
**Hosted on:** Vercel (frontend) + Supabase (database)

**Staff screens (test PIN: 1234):**
- Reception: /reception
- Barber: /barber/ravi
- TV display: /display
- Owner settings: /admin

## About
A queue app for a salon. Customers join from their phone, see their position and
estimated wait, and get called. Reception and barbers manage the queue, and a TV
shows who is with which barber. Labels are in English and Hindi.

## Features
- Join queue with service and barber selection, live total time and price
- Live status with position, wait time, "Start coming" and "It's your turn" states
- Reception dashboard: call next, no-show, cancel, walk-ins
- Barber view: Start / Done, on break toggle
- Waiting-area TV display
- Owner settings and stats
- English / Hindi toggle

## Tech stack
React + Vite + Tailwind CSS, Supabase (Postgres + realtime), Vercel

## Run locally
1. `npm install`
2. Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/schema.sql` in the Supabase SQL editor
4. `npm run dev`

## Project docs
- docs/01-brief.md, docs/02-screens.md, docs/03-flows-rules.md, AGENTS.md
- prompts.md: every prompt used, in order

## Demo video
<link to your 3-minute video>

## Reflection
<half page: one thing the agent got wrong, how you noticed, how you fixed your prompt or doc>