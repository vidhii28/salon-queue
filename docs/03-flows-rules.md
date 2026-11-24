# Salon Queue: Flows & Rules

## Flow: remote customer
1. Opens Home -> Join -> picks Haircut + "Any barber" -> gets token S-14, 6th in line
2. Watches My Status from home; at 2nd in line gets "Start coming"
3. Receptionist taps [Call next] on Amit's card -> S-14 becomes "Called"
4. Customer's phone shows "It's your turn! Go to Amit"; TV flashes S-14
5. Amit taps [Start], then [Done] -> S-14 leaves the queue

## Flow: walk-in
Receptionist taps [+ Add walk-in] -> name, phone, services ->
joins the same queue at the end (first come, first served).

## Statuses
- Waiting -> Called -> In chair -> Done. Never backwards.
- Waiting -> Cancelled.
- Called -> No-show.

## Rules
- First come, first served.
- Tokens are numbered S-1, S-2, ... in joining order.
- Call next for barber X picks the earliest waiting customer who
  chose X or "Any".
- A customer who chose Ravi is never given to another barber.
- A barber has only one customer in the chair at a time.
- Waiting time ≈ total minutes of services ahead ÷ barbers working.
- One active spot per phone number.
- Called but not here in 10 min -> receptionist can mark No-show.
  If they arrive later, they are added again at the END with a new token.
- Online joining closes 30 min before closing time; walk-ins still allowed.
- Barber on break -> customers who chose them see "Ravi is on break".
- Staff screens (reception, barber, admin) need a PIN: 1234.

## Test checklist
[ ] Join with 2 services -> correct total time and price shown
[ ] Same phone joins twice -> shown existing spot, no duplicate
[ ] Call next for Amit skips a customer who chose Ravi
[ ] Call next -> customer's phone shows "It's your turn" within 5 s
[ ] Start/Done on Barber View updates Reception and TV
[ ] No-show, then re-add -> goes to end of queue with new token
[ ] Close online queue -> Join button disabled with message
[ ] Language toggle switches all labels to Gujarati
[ ] Waiting time goes down as customers finish
[ ] Phone, tablet and TV windows all stay in sync
[ ] Wrong PIN on a staff screen -> access denied