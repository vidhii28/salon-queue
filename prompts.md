# Prompts Log

Every prompt used while building the Salon Queue app, in order.
Tool used: OpenAI Codex (VS Code extension)

---

## 1. Check rules
**Prompt:**
Read AGENTS.md and tell me the rules you'll follow while building this project.

**Result:** worked
**Notes:** Codex listed the rules from AGENTS.md.

---

## 2. Understand & set up
**Prompt:**
Read AGENTS.md and all of docs/. Summarise the app in 8 bullets and list
questions. Then set up the project with empty pages for all 7 screens, the
theme, and the EN/GU toggle.

**Result:** skipped
**Notes:** Not run. Codex found the repo had only docs, so project setup ended up happening inside prompt 4.

---

## 3. Build Home + Join (first attempt)
**Prompt:**
Build Screen 1 (Home) and Screen 2 (Join Queue) from docs/02-screens.md with
dummy services and barbers (Ravi, Amit, Imran). Validate phone numbers (10
digits) and the 3-service limit. The live summary on Join must update as I
select services. Mobile-first, charcoal + gold theme. Don't touch other
screens. List the files you changed and how to test.

**Result:** failed
**Notes:** Codex only read the docs and planned. No app files were created, and `npm install` failed with "package.json not found". The repo had no Vite project yet, so I should have asked for setup in the same prompt.

---

## 4. Set up project + build Home + Join
**Prompt:**
No app files were created in salon-queue. Set up a React + Vite + Tailwind project directly in this folder (package.json at the root of salon-queue, not a subfolder). Then build Screen 1 (Home) and Screen 2 (Join Queue) from docs/02-screens.md with dummy data. Don't touch other screens. Run npm install and confirm npm run dev works. List the files you changed and how to test.

**Result:** worked
**Notes:** Created index.html, vite.config.js, package.json and src/ inside salon-queue. Home and Join run with `npm run dev`.

---

## 5. Switch second language from Gujarati to Hindi
**Prompt:**
Change the app's second language from Gujarati to Hindi. Rename the toggle from EN/GU to EN/HI, replace every Gujarati label in the language file with natural Hindi (Devanagari), and rename any "gu" keys or files to "hi". Make sure no label is hard-coded and nothing is left in Gujarati. Use a font that renders Devanagari properly (e.g. Noto Sans Devanagari). Don't change any other behaviour or layout. List the files you changed and how to test.

**Result:** worked
**Notes:** I changed my mind about the language after writing the docs. Updated docs and AGENTS.md by find-and-replace first, then used this prompt for the code. EN/HI toggle works on Home and Join.

---

## 6.
**Prompt:**
Build Screen 3 (My Status, /status/:id) from docs/02-screens.md. After Confirm on Join, give the customer a token (S-1, S-2...) and open My Status. Show the token, position in line, and estimated wait using the waiting-time rule in docs/03-flows-rules.md. Add the "Start coming" banner at 2nd in line, the full-screen gold "It's your turn! Go to <barber>" state, the "<barber> is on break" message, and [Cancel my spot] with a confirmation pop-up. Enforce one active spot per phone number (show the existing spot instead of a duplicate). Show "Spot not found" for an invalid id. All labels in EN/HI. Keep the queue rules in one place in the code. Don't touch other screens. Since Reception doesn't exist yet, add a small temporary dev panel on this screen to simulate moving up in line, being called, and barber on break, so I can test each state. List the files you changed and how to test.

**Result:** worked
**Notes:** All states tested with the dev panel (2nd in line, called, on break, cancel, duplicate phone, invalid id) in EN and HI.

---

## 7.
**Prompt:**
Before writing code for the Reception Dashboard: right now the queue data lives only in one browser. Phone, tablet and TV windows must share one queue and stay in sync within 5 seconds. Suggest the simplest storage that works with Vercel hosting, explain your choice in 3 lines, list the files you'll change and any accounts or setup I need to do myself. Don't write code yet. Wait for my OK.

**Result:** worked
**Notes:** Codex recommended Supabase Postgres: Vercel hosts the app, Supabase stores one shared queue and sends live updates to phone, tablet and TV. It listed the changes (Supabase client, env config, shared data layer) and said I need my own Supabase project plus the URL and anon key as Vercel environment variables. I approved the plan before any code was written.


## 8. Add Supabase and shared data layer
**Prompt:**
OK, go ahead with Supabase. Step 1 only: add the Supabase client, a .env.example file (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY), and a single shared data layer for the queue. Move the existing join / status / cancel logic onto it so phone windows share one queue. Write the database schema and policies as a supabase/schema.sql file that I can paste into the Supabase SQL editor, and enable realtime for the queue table. Add a fallback that refreshes data every 3 seconds in case realtime fails. Make sure .env is in .gitignore. Don't build Reception yet and don't touch other screens. List the files you changed and tell me exactly what I need to do in Supabase.

**Result:** partly
**Notes:** Codex added the Supabase client, shared data layer, .env.example and supabase/schema.sql. The app then crashed with "Failed to resolve import @supabase/supabase-js" because the package wasn't installed. Fixed by running npm install (and npm install @supabase/supabase-js if needed). Then I created the Supabase project, ran schema.sql in the SQL editor, added the URL and anon key to .env and to Vercel, and restarted npm run dev.

## 9. Reception Dashboard
**Prompt:**
Build the Reception Dashboard (Screen 4, /reception) for a 10-inch tablet in landscape from docs/02-screens.md, protected by PIN 1234 (wrong PIN is denied). Left: barber cards with current customer, time left and [Call next]. Right: waiting list in order with token, name, services, preferred barber, waiting time, [No-show] and [Cancel]. Top: [+ Add walk-in] opens a quick form (name, phone, services). Waiting over 60 min is highlighted amber. Empty state: "No one waiting". Customers who join from a phone must appear automatically. Implement Call next exactly as in docs/03-flows-rules.md: it picks the earliest waiting customer who chose that barber or "Any", and never gives a Ravi customer to another barber. Mark No-show only after 10 min of being called, and a re-added customer goes to the END with a new token. Remove the temporary dev panel from My Status once real calling works. All labels in EN/HI. Keep queue rules in one place. Don't touch other screens. Then give me 3 scenarios I can try by hand to prove barber preferences are respected. List the files you changed and how to test.

**Result:** worked
**Notes:** Tested with /reception on a tablet-size window and /join and /status on a phone-size window. New joins appear on Reception without refresh. Call next updates the customer's phone within 5 s. Barber preference verified: with one Ravi customer and one "Any" customer, Call next on Amit skipped the Ravi customer and picked "Any"; Call next on Ravi picked the Ravi customer. Walk-ins and re-added no-shows go to the end with a new token. Wrong PIN is denied. EN/HI works. Dev panel removed from My Status.

## 10. Barber View + Waiting Area TV
**Prompt:**
Build the Barber View (Screen 5, /barber/:name, phone, PIN 1234) and the Waiting Area TV (Screen 6, /display) from docs/02-screens.md. Barber View: current customer with name, services and timer since start, big [Start] then [Done] buttons (min 44px), "Next for you" line, and an On break / Available toggle. TV: a row per barber with name and "Now: <token>", an "Up next" list of 5 tokens with estimated times, large text readable from 5 metres, and the newly called token flashes gold with a chime. Start, Done and On break must update Reception, TV and the customer's phone within 5 seconds via Supabase. A barber on break must not get Call next on Reception. Empty states for both. All labels in EN/HI. Keep queue rules in one place. Don't touch other screens. List the files you changed and how to test.

**Result:** worked
**Notes:** Tested /barber/ravi with PIN 1234: Start and Done work. Call next on Reception flashes the TV and shows "It's your turn" on the customer's phone. Start/Done and On break update Reception and TV within 5 seconds. EN/HI works on both screens.