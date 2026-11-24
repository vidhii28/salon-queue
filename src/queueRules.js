export const SERVICES = [
  { id: 'haircut', minutes: 30, price: 150 },
  { id: 'beard', minutes: 15, price: 80 },
  { id: 'spa', minutes: 45, price: 400 },
]
export const MAX_SERVICES_PER_SPOT = 3

export function createDefaultSettings() {
  return {
    queueOpen: true,
    services: SERVICES.map((service) => ({
      ...service,
      nameEn: { haircut: 'Haircut', beard: 'Beard trim', spa: 'Hair spa' }[service.id],
      nameHi: { haircut: '\u0939\u0947\u092f\u0930\u0915\u091f', beard: '\u0926\u093e\u0922\u093c\u0940 \u091f\u094d\u0930\u093f\u092e', spa: '\u0939\u0947\u092f\u0930 \u0938\u094d\u092a\u093e' }[service.id],
      enabled: true,
    })),
    barbers: Object.fromEntries(BARBERS.map(({ name }) => [name, true])),
  }
}

export function normalizeSettings(raw) {
  const defaults = createDefaultSettings()
  if (!raw) return defaults
  const inputServices = Array.isArray(raw.services) ? raw.services : []
  return {
    queueOpen: raw.queueOpen ?? raw.queue_open ?? defaults.queueOpen,
    services: defaults.services.map((service) => {
      const input = inputServices.find((item) => item.id === service.id) ?? {}
      return {
        ...service,
        nameEn: input.nameEn ?? input.name_en ?? service.nameEn,
        nameHi: input.nameHi ?? input.name_hi ?? service.nameHi,
        minutes: Number(input.minutes ?? service.minutes),
        price: Number(input.price ?? service.price),
        enabled: input.enabled ?? true,
      }
    }),
    barbers: Object.fromEntries(BARBERS.map(({ name }) => [name, raw.barbers?.[name] ?? true])),
  }
}

export const BARBERS = [
  { name: 'Ravi', state: 'busy', initials: 'R', color: 'from-[#bd8156] to-[#57392e]' },
  { name: 'Amit', state: 'free', initials: 'A', color: 'from-[#727b6b] to-[#3d4d42]' },
  { name: 'Imran', state: 'break', initials: 'I', color: 'from-[#887b9a] to-[#4d405c]' },
]

const DEMO_PHONES = ['9000000001', '9876543210', '9000000003', '9000000004', '9000000005', '9000000006']

export function createDemoQueue() {
  const demoServices = ['haircut', 'beard', 'beard', 'beard', 'beard', 'beard']
  return demoServices.map((serviceId, index) => ({
    id: `demo-${index + 1}`,
    token: `S-${index + 1}`,
    name: `Guest ${index + 1}`,
    phone: DEMO_PHONES[index],
    serviceIds: [serviceId],
    barber: 'any',
    status: 'waiting',
    createdAt: Date.now(),
  }))
}

export function createSpot({ id, tokenNumber, name, phone, serviceIds, barber }) {
  return { id, token: `S-${tokenNumber}`, name, phone, serviceIds, barber, status: 'waiting', createdAt: Date.now() }
}

export function joinQueue(spots, nextNumber, details) {
  const existing = findActiveSpotByPhone(details.phone, spots)
  if (existing) return { spot: existing, spots, nextNumber, existing: true }

  const spot = createSpot({ ...details, tokenNumber: nextNumber })
  return { spot, spots: [...spots, spot], nextNumber: nextNumber + 1, existing: false }
}

export function findActiveSpotByPhone(phone, spots) {
  return spots.find((spot) => spot.phone === phone && ['waiting', 'called'].includes(spot.status))
}

export function isValidPhone(phone) {
  return /^\d{10}$/.test(phone)
}

export function calculateServiceTotals(serviceIds, services = SERVICES) {
  return serviceIds.reduce((totals, serviceId) => {
    const service = services.find((item) => item.id === serviceId)
    return service ? { minutes: totals.minutes + service.minutes, price: totals.price + service.price } : totals
  }, { minutes: 0, price: 0 })
}

export function getWaitingSpots(spots) {
  return spots.filter((spot) => spot.status === 'waiting').sort((a, b) => tokenNumber(a.token) - tokenNumber(b.token))
}

export function getSpotPosition(spotId, spots) {
  const index = getWaitingSpots(spots).findIndex((spot) => spot.id === spotId)
  return index < 0 ? null : index + 1
}

export function getEstimatedWaitMinutes(spotId, spots, barberStates) {
  const waiting = getWaitingSpots(spots)
  const index = waiting.findIndex((spot) => spot.id === spotId)
  if (index < 0) return 0

  const minutesAhead = waiting.slice(0, index).reduce((total, spot) => total + spot.serviceIds.reduce((sum, serviceId) => {
    return sum + (SERVICES.find((service) => service.id === serviceId)?.minutes ?? 0)
  }, 0), 0)
  const workingBarbers = Math.max(1, BARBERS.filter((barber) => !['break', 'off'].includes(barberStates[barber.name])).length)
  return Math.ceil(minutesAhead / workingBarbers)
}

export function isPreferredBarberOnBreak(spot, barberStates) {
  return spot?.barber !== 'any' && barberStates[spot?.barber] === 'break'
}

export function callNextForBarber(barberName, spots, barberStates, now = Date.now()) {
  const barber = BARBERS.find((item) => item.name === barberName)
  if (!barber || ['break', 'off'].includes(barberStates[barberName]) || spots.some((spot) => spot.calledBy === barberName && ['called', 'in_chair'].includes(spot.status))) return { spots, called: null }
  const next = getWaitingSpots(spots).find((spot) => (spot.barber === 'any' || spot.barber === barberName) && (spot.barber === 'any' || barberStates[spot.barber] !== 'break'))
  if (!next) return { spots, called: null }
  return { spots: spots.map((spot) => spot.id === next.id ? { ...spot, status: 'called', calledBy: barberName, calledAt: now } : spot), called: next }
}

export function startSpot(spotId, spots, now = Date.now()) {
  return spots.map((spot) => spot.id === spotId && spot.status === 'called'
    ? { ...spot, status: 'in_chair', startedAt: now }
    : spot)
}

export function finishSpot(spotId, spots) {
  return spots.map((spot) => spot.id === spotId && spot.status === 'in_chair'
    ? { ...spot, status: 'done' }
    : spot)
}

export function getNextForBarber(barberName, spots, barberStates) {
  return getWaitingSpots(spots).find((spot) =>
    (spot.barber === 'any' || spot.barber === barberName) &&
    (spot.barber === 'any' || barberStates[spot.barber] !== 'break')
  ) ?? null
}

export function markNoShow(spotId, spots, now = Date.now()) {
  return spots.map((spot) => spot.id === spotId && spot.status === 'called' && now - (spot.calledAt ?? spot.createdAt) >= 10 * 60_000 ? { ...spot, status: 'no_show' } : spot)
}

export function cancelWaitingSpot(spotId, spots) {
  return spots.map((spot) => spot.id === spotId && ['waiting', 'called'].includes(spot.status) ? { ...spot, status: 'cancelled' } : spot)
}

export function nextTokenNumber(spots) {
  return Math.max(0, ...spots.map((spot) => tokenNumber(spot.token))) + 1
}

function tokenNumber(token) {
  return Number(token?.match(/\d+$/)?.[0] ?? 0)
}
