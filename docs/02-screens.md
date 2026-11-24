# Salon Queue: Screens

Theme: charcoal (#1F2937) + gold (#D4A017), rounded cards.
All labels in English + Gujarati (language toggle in the header).

## Screen 1: Home (/) - phone
- Salon name + logo, badge: "Open · Closes 9 PM"
- Live card: "6 people waiting · about 50 min"
- Barber chips with status: Ravi (busy) · Amit (free) · Imran (on break)
- Big gold button [ Join Queue ]
- Empty state: "No one waiting - walk right in!"
- Queue closed: button disabled, message "Online queue is closed"

## Screen 2: Join Queue (/join) - phone
- Name, Phone (10 digits, validated)
- Service cards, multi-select, max 3:
  Haircut 30 min ₹150, Beard trim 15 min ₹80, Hair spa 45 min ₹400
- Barber picker: "Any barber (fastest)" or a barber's photo card
- Live summary: "Total 45 min · ₹230 · Expected wait ~35 min"
- [ Confirm ] -> goes to My Status
- Errors: invalid phone, no service selected, 4th service blocked,
  phone already in queue -> show existing spot instead

## Screen 3: My Status (/status/:id) - phone
- Token "S-14" large, position "4th in line"
- Circular countdown "about 35 min", updates by itself
- When 2nd in line: banner "Start coming to the salon"
- When called: full-screen gold "It's your turn! Go to Ravi"
- If chosen barber is on break: "Ravi is on break"
- [ Cancel my spot ] with a confirmation pop-up
- Error: invalid/expired id -> "Spot not found" + button to Home

## Screen 4: Reception Dashboard (/reception) - tablet landscape
- Left: barber cards (current customer, time left, [ Call next ])
- Right: waiting list in order: token, name, services,
  preferred barber, waiting time, [ No-show ] [ Cancel ]
- Top: [ + Add walk-in ] opens a quick form (name, phone, services)
- Waiting > 60 min highlighted in amber
- Empty state: "No one waiting"
- PIN needed to open

## Screen 5: Barber View (/barber/:name) - phone
- Current customer: name, services, timer since start
- Big buttons: [ Start ] -> [ Done ] (min 44px tap size)
- "Next for you: S-15 Kunal (Haircut)"
- Toggle: On break / Available
- Empty state: "No customer right now"
- PIN needed to open

## Screen 6: Waiting Area TV (/display) - TV, readable from 5 m
- Row per barber: photo, name, "Now: S-12"
- "Up next" list of 5 tokens with estimated times
- Newly-called token flashes gold + chime
- Empty state: "No one waiting"

## Screen 7: Owner Settings (/admin) - tablet/laptop
- Services list (name EN/GU, minutes, price, on/off)
- Barbers on duty today (toggle)
- Queue switch: Open / Closed for online joining
- Today's stats: customers served, average wait, no-shows
- PIN needed to open
