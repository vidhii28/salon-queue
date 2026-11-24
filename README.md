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

**The main thing the agent got wrong.** My first prompt asked Codex to build the Home
and Join screens, but my repo only had the docs and no project yet. Codex just read
the docs and made a plan, it didn't create any files. I found out when `npm install`
said "package.json not found". I fixed it by writing the prompt again so that it
sets up the project (React + Vite + Tailwind) and builds the screens in the same step.

**Other problems I faced and how I fixed them**
- **Antigravity wouldn't open my project folder**, so I switched to Codex in VS Code.
  Git also wasn't working in my terminal, so I used the GitHub app.
- **Missing package:** after Codex added Supabase, the app crashed with "Failed to
  resolve import @supabase/supabase-js". The code was using the package but it wasn't
  installed. Running `npm install` fixed it.
- **Wrong Supabase URL (my mistake):** joining the queue gave "Invalid path specified".
  In the browser console I saw `/rest/v1` two times in the URL, because I had pasted
  the full API path in `VITE_SUPABASE_URL`. I changed it to just the project URL.
- **Token didn't start from S-1:** I deleted my test rows but the tokens kept going
  from S-8. I looked at the `join_queue` function and saw the token comes from a
  Postgres sequence, which doesn't reset when rows are deleted. I reset it with SQL.
- **Join worked on my laptop but not on my phone or tablet.** The error was
  "Could not find the function public.join_queue(... p_source)". My code was newer
  than the function in Supabase, and my laptop was still showing an older version of
  the site. I ran `supabase/schema.sql` again and it worked.
- **Barber screen went blank after entering the PIN.** The console error said I was
  subscribing to the same realtime channel more than once. I gave each subscription its
  own name and removed it when the screen closes.
- **Reception screen didn't fit on tablet and small screens**, so I wrote a separate
  prompt with the exact screen sizes and layouts I wanted.

**What I learned**
- If a step needs setup, the prompt should say so. A vague prompt gave me a plan
  instead of working files.
- The browser console usually shows the real reason for an error. The app's own message
  ("check your connection") was too general.
- The code and the database can go out of sync. After changing the code, I should run
  the schema again and test on another device, not just my laptop.
- Testing on my phone with the live link found bugs that localhost didn't show.
- Updating the docs first and then prompting (like when I changed Gujarati to Hindi)
  kept the code and docs matching.