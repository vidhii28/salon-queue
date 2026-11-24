# Salon Queue Management System

**Live demo:** https://salon-queue-nine.vercel.app
**Hosted on:** Vercel (frontend) + Supabase (database)

**Staff screens** (test PIN: `1234`):
- Reception: `/reception`
- Barber: `/barber/ravi`, `/barber/Amit`, `/barber/Imran`
- Waiting-area TV: `/display`
- Owner settings: `/admin`

## About
A queue app for a salon. On weekends customers wait 1-2 hours without knowing their
turn. With this app they join the queue from their phone, see their position and
estimated wait, and get called when it is their turn. Reception and barbers manage
the queue, and a TV in the waiting area shows who is with which barber. All labels
are available in English and Hindi.

## Features
- Join the queue from a phone: pick up to 3 services and a barber (or "Any")
- Live total time, price and expected wait while choosing services
- Live status: token, position in line, estimated wait, "Start coming" banner and a
  full-screen "It's your turn" alert
- Reception dashboard: call next, no-show, cancel, add walk-in
- Barber view: Start / Done, on break / available
- Waiting-area TV with current customer per barber and the next 5 tokens
- English / Hindi language toggle
- One active spot per phone number; barber preferences are always respected
- Owner settings: turn services on/off, set barbers on duty, open/close online joining, today's stats


## Queue rules
- First come, first served
- Call next for a barber picks the earliest customer who chose that barber or "Any"
- A customer who chose Ravi is never given to another barber
- Waiting time = total minutes of services ahead / barbers working
- A no-show who returns is added again at the end with a new token
- Online joining can be closed by the owner; walk-ins at Reception still work

## Tech stack
React + Vite + Tailwind CSS, Supabase (Postgres with realtime), Vercel

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` (base project URL,
   without `/rest/v1`) and `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/schema.sql` in the Supabase SQL editor
4. `npm run dev`

## Project docs
- `docs/01-brief.md`: problem, users, features, what not to build
- `docs/02-screens.md`: every screen
- `docs/03-flows-rules.md`: flows, queue rules, test checklist
- `AGENTS.md`: instructions for the coding agent
- `prompts.md`: every prompt used, in order, including the ones that failed

Built with OpenAI Codex.

## Demo video
https://drive.google.com/file/d/1Zr4yhO328tk-yQMj3i2tPq16okAZF3CP/view?usp=drive_link

## Reflection
The agent got my first build prompt wrong. I asked Codex to build the Home and Join
screens, but the repo only had docs and no project yet, so it read the specs and
planned without creating any files. I noticed when `npm install` failed with
"package.json not found". I fixed it by rewriting the prompt to ask for the React +
Vite + Tailwind setup in the same step, with the files at the root of the repo.

A second problem was my own mistake: joining the queue failed with a Supabase
"invalid path" error. The browser console showed `/rest/v1` twice in the request
URL, which meant I had pasted the full API path into `VITE_SUPABASE_URL`. Using only
the base project URL fixed it. The lesson for my docs and prompts: ask the agent for
a visible error message and check it, and ask for plan-first on any step that needs
setup outside the code, like creating the database.