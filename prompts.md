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

---

## 8. Add Supabase and shared data layer
**Prompt:**
OK, go ahead with Supabase. Step 1 only: add the Supabase client, a .env.example file (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY), and a single shared data layer for the queue. Move the existing join / status / cancel logic onto it so phone windows share one queue. Write the database schema and policies as a supabase/schema.sql file that I can paste into the Supabase SQL editor, and enable realtime for the queue table. Add a fallback that refreshes data every 3 seconds in case realtime fails. Make sure .env is in .gitignore. Don't build Reception yet and don't touch other screens. List the files you changed and tell me exactly what I need to do in Supabase.

**Result:** partly
**Notes:** Codex added the Supabase client, shared data layer, .env.example and supabase/schema.sql. The app then crashed with "Failed to resolve import @supabase/supabase-js" because the package wasn't installed. Fixed by running npm install (and npm install @supabase/supabase-js if needed). Then I created the Supabase project, ran schema.sql in the SQL editor, added the URL and anon key to .env and to Vercel, and restarted npm run dev.
Join then failed with PGRST125 "Invalid path": I had pasted the full API path into VITE_SUPABASE_URL, so /rest/v1 appeared twice in the request URL in the browser console. Fixed by using only the base project URL.

---

## 9. Reception Dashboard
**Prompt:**
Build the Reception Dashboard (Screen 4, /reception) for a 10-inch tablet in landscape from docs/02-screens.md, protected by PIN 1234 (wrong PIN is denied). Left: barber cards with current customer, time left and [Call next]. Right: waiting list in order with token, name, services, preferred barber, waiting time, [No-show] and [Cancel]. Top: [+ Add walk-in] opens a quick form (name, phone, services). Waiting over 60 min is highlighted amber. Empty state: "No one waiting". Customers who join from a phone must appear automatically. Implement Call next exactly as in docs/03-flows-rules.md: it picks the earliest waiting customer who chose that barber or "Any", and never gives a Ravi customer to another barber. Mark No-show only after 10 min of being called, and a re-added customer goes to the END with a new token. Remove the temporary dev panel from My Status once real calling works. All labels in EN/HI. Keep queue rules in one place. Don't touch other screens. Then give me 3 scenarios I can try by hand to prove barber preferences are respected. List the files you changed and how to test.

**Result:** worked
**Notes:** Tested with /reception on a tablet-size window and /join and /status on a phone-size window. New joins appear on Reception without refresh. Call next updates the customer's phone within 5 s. Barber preference verified: with one Ravi customer and one "Any" customer, Call next on Amit skipped the Ravi customer and picked "Any"; Call next on Ravi picked the Ravi customer. Walk-ins and re-added no-shows go to the end with a new token. Wrong PIN is denied. EN/HI works. Dev panel removed from My Status.

---

## 10. Barber View + Waiting Area TV
**Prompt:**
Build the Barber View (Screen 5, /barber/:name, phone, PIN 1234) and the Waiting Area TV (Screen 6, /display) from docs/02-screens.md. Barber View: current customer with name, services and timer since start, big [Start] then [Done] buttons (min 44px), "Next for you" line, and an On break / Available toggle. TV: a row per barber with name and "Now: <token>", an "Up next" list of 5 tokens with estimated times, large text readable from 5 metres, and the newly called token flashes gold with a chime. Start, Done and On break must update Reception, TV and the customer's phone within 5 seconds via Supabase. A barber on break must not get Call next on Reception. Empty states for both. All labels in EN/HI. Keep queue rules in one place. Don't touch other screens. List the files you changed and how to test.

**Result:** worked
**Notes:** Tested /barber/ravi with PIN 1234: Start and Done work. Call next on Reception flashes the TV and shows "It's your turn" on the customer's phone. Start/Done and On break update Reception and TV within 5 seconds. EN/HI works on both screens.

---

## 11. Owner Settings
**Prompt:**
Build the Owner Settings screen (Screen 7, /admin, PIN 1234) from docs/02-screens.md. Services list with name EN/HI, minutes, price and an on/off toggle; barbers on duty today toggle; queue switch Open / Closed for online joining; today's stats cards (customers served, average wait, no-shows). Turning off a service hides it from Join. Closing the queue disables the Join button on Home and Join with a clear message, but walk-ins at Reception still work. Store the settings in Supabase so all devices see them. All labels in EN/HI. Don't touch other screens. List the files you changed and how to test.

**Result:** worked
**Notes:** Settings (services on/off, barbers on duty, queue open/closed) are stored in Supabase table salon_settings and used by join_queue.

---

## 12. Reception Screen Responsiveness
**Prompt:**
Fix responsiveness of the Reception Dashboard (/reception) only. It must work well on a 10-inch tablet in landscape (1024-1280px), a laptop, and a narrow window (about 400px). Barber cards: 3 columns in a row on tablet/laptop, stacked on narrow screens. Waiting list: on tablet/laptop keep the table, but with no horizontal scrolling at 1024px (reduce padding and font size if needed). On narrow screens (under 768px) show each waiting customer as a card instead of a table row, with token, name, services, preferred barber, waiting time, and the No-show and Cancel buttons (min 44px). Header and [+ Add walk-in] must not overflow, and the walk-in form must fit on small screens. Keep amber highlight, PIN gate, EN/HI labels and all behaviour unchanged. Don't touch other screens. List the files you changed and how to test.

**Result:** worked
**Notes:** Reception was not usable on tablet and narrow screens. Prompt asked for 3-column barber cards, no horizontal scroll at 1024px and cards instead of a table under 768px. Checked at laptop, 1024px and 400px widths.

---

## 13. Token counter reset
**Prompt:**

Bug: After deleting all rows from queue_spots, new tokens continue from the old number instead of S-1. Look at how join_queue in supabase/schema.sql generates the token, and give me the exact SQL to reset that counter to 1. Explain the cause first. Don't change app behaviour.

**Result:** worked
**Notes:** After deleting rows, tokens continued from S-8. Cause: tokens come from the Postgres sequence queue_token_seq, which does not reset on delete. Fixed with `alter sequence public.queue_token_seq restart with 1;` in the SQL editor.

---

## 14. Join fails on both phone and tablet
**Prompt:**
Bug: On a phone and tablet, joining from the live Vercel link fails with "Could not join the queue. Check your connection and try again." On a laptop it works. Expected: it works on all devices. Show the real error message (from Supabase or the browser) on screen under the Join button, and also console.error it. Check that nothing in the Join flow depends on laptop-only things (localStorage reads that can throw, crypto.randomUUID, or a browser-specific API) and add safe fallbacks. Explain the cause first, then fix it. Don't change other behaviour.

**Result:** worked
**Notes:** Phone showed "Could not join the queue". The real error was "Could not find the function public.join_queue(... p_source)": the live database had an older join_queue than the app expected, while my laptop was running an older cached build. Fixed by re-running supabase/schema.sql and reloading the schema cache.

---

## 15. Blank Barber Screen
**Prompt:**
Bug: On /barber/Ravi, after entering PIN 1234 the screen goes completely blank. Expected: the Barber View from docs/02-screens.md (current customer, [Start] then [Done], "Next for you", On break / Available toggle), and clear empty states when there is no customer. Find the runtime error that crashes the render (likely a missing field or undefined value after the Supabase queue_spots / salon_settings changes, e.g. accessing a property of an undefined spot or barber state). Add safe fallbacks for undefined values and an error boundary that shows a readable message instead of a blank page. Explain the cause first, then fix it. Don't touch other screens.

**Result:** partly
**Notes:** Barber screen went blank after the PIN. The console error showed the real cause (a realtime channel subscribed twice), so I wrote a more specific prompt (entry 16).

---

## 16. Realtime channel crash
**Prompt:**
Bug: After entering the PIN on /barber/Ravi the page goes blank with "Uncaught Error: cannot add postgres_changes callbacks for realtime:barber-presence-sync after subscribe()". Cause: the same Supabase realtime channel name is subscribed more than once (several components or React effects). Fix it everywhere: every supabase.channel(...) call must use a unique name per subscription and its useEffect must return a cleanup that calls supabase.removeChannel(channel). Better, subscribe once in the shared data layer and share the data via context or props. Search all files for supabase.channel. Don't change any other behaviour. Explain the cause first, then fix it. List the files you changed.

**Result:** worked
**Notes:** Error: "cannot add postgres_changes callbacks for realtime:barber-presence-sync after subscribe()". Cause: the same channel name subscribed in more than one place. Fixed with unique channel names and removeChannel cleanup. /barber/Ravi now loads after the PIN.