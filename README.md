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

**The main thing the agent got wrong.** My first build prompt asked Codex to build
the Home and Join screens, but the repo only had docs and no project yet. Codex read
the specs and planned, but created no files. I noticed when `npm install` failed with
"package.json not found". I fixed it by rewriting the prompt so that project setup
(React + Vite + Tailwind at the root of the repo) and the screens were asked for in
the same step.

**Other things that went wrong, and how I found and fixed them**
- **Antigravity could not open my project folder**, so I switched to Codex in VS Code.
  Git was also not recognised in the terminal, so I used the GitHub app instead.
- **Missing package:** after Codex added Supabase, the app crashed with "Failed to
  resolve import @supabase/supabase-js". The package was in the code but not installed.
  `npm install` fixed it.
- **Wrong Supabase URL (my mistake):** joining failed with "Invalid path specified".
  The browser console showed `/rest/v1` twice in the request URL, because I had pasted
  the full API path into `VITE_SUPABASE_URL`. Using only the base project URL fixed it.
- **Token numbers did not restart at S-1.** After I deleted test rows, tokens continued
  from S-8. I read the `join_queue` function and found tokens come from a Postgres
  sequence, which does not reset on delete. I reset it manually with SQL.
- **Joining failed on phone and tablet but worked on my laptop.** The error was
  "Could not find the function public.join_queue(... p_source)". The app expected a
  newer database function than the one in Supabase, and my laptop was running an older
  cached build. Re-running `supabase/schema.sql` and reloading the schema cache fixed it.
- **Blank Barber screen after the PIN.** The console said "cannot add postgres_changes
  callbacks ... after subscribe()": the same realtime channel was subscribed more than
  once. Unique channel names and `removeChannel` cleanup fixed it.
- **Reception was not responsive** on tablet and narrow screens, so I wrote a separate
  prompt with exact breakpoints and layouts.

**What I learned**
- A prompt must say everything the step needs, including setup. A vague "build this"
  gave me a plan instead of files.
- The browser console and the Network tab usually name the real cause. The app's own
  message ("check your connection") was too generic, so I now ask for real errors to be
  shown.
- The database and the code can drift apart. After changing the code that talks to
  Supabase, I must re-run the schema and test on a second device, not only my laptop.
- Testing on a phone and on the live link caught problems that localhost hid.
- Editing the docs first (for example when I changed Gujarati to Hindi) and then
  prompting kept the agent and the docs consistent.