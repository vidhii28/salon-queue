import { BARBERS, callNextForBarber, createDemoQueue, finishSpot, joinQueue as joinLocalQueue, nextTokenNumber, startSpot } from './queueRules.js'
import { isCloudQueueEnabled, supabase } from './supabaseClient.js'

const POLL_INTERVAL_MS = 3000
const CANCEL_KEY_PREFIX = 'salon-queue-cancel:'
let localSpots = createDemoQueue()
let localNextTokenNumber = nextTokenNumber(localSpots)
let localBarberStates = Object.fromEntries(BARBERS.map(({ name, state }) => [name, state]))
const localSubscribers = new Set()

export { isCloudQueueEnabled }

export function getSpotById(spotId, spots) {
  return spots.find((spot) => spot.id === spotId)
}

export async function loadQueue() {
  if (!supabase) return [...localSpots]

  const { data, error } = await supabase
    .from('queue_spots')
    .select('id, token, service_ids, preferred_barber, status, called_barber, created_at, called_at, started_at')
    .in('status', ['waiting', 'called', 'in_chair'])
    .order('token', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalizeSpot)
}

export async function loadStaffQueue(pin) {
  if (!supabase) return [...localSpots]
  const { data, error } = await supabase.rpc('staff_queue', { p_pin: pin })
  if (error) throw error
  return (data ?? []).map(normalizeSpot)
}

export async function loadBarberStates() {
  if (!supabase) return { ...localBarberStates }
  const { data, error } = await supabase.from('barber_presence').select('barber_name,on_break')
  if (error) throw error
  return Object.fromEntries((data ?? []).map(({ barber_name, on_break }) => [barber_name, on_break ? 'break' : 'free']))
}

export function subscribeToBarberStates(onUpdate, onError = console.error) {
  let active = true
  const refresh = async () => { try { const states = await loadBarberStates(); if (active) onUpdate(states) } catch (error) { if (active) onError(error) } }
  let channel
  if (supabase) {
    channel = supabase.channel('barber-presence-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'barber_presence' }, refresh).subscribe()
  } else localBarberSubscribers.add(onUpdate)
  refresh()
  const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
  return () => { active = false; window.clearInterval(timer); localBarberSubscribers.delete(onUpdate); if (channel) supabase.removeChannel(channel) }
}

export function subscribeToStaffQueue(pin, onUpdate, onError = console.error) {
  if (!supabase) return subscribeToQueue(onUpdate, onError)
  let active = true
  const refresh = async () => { try { const queue = await loadStaffQueue(pin); if (active) onUpdate(queue) } catch (error) { if (active) onError(error) } }
  const channel = supabase.channel(`staff-queue-${Math.random().toString(16).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_spots' }, refresh).subscribe()
  refresh()
  const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
  return () => { active = false; window.clearInterval(timer); supabase.removeChannel(channel) }
}

export async function staffCallNext(pin, barberName, spots, barberStates) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    const result = callNextForBarber(barberName, localSpots, localBarberStates)
    localSpots = result.spots
    notifyLocalSubscribers()
    return result.called
  }
  const { data, error } = await supabase.rpc('staff_call_next', { p_pin: pin, p_barber: barberName })
  if (error) throw error
  return data
}

export async function staffStart(pin, barberName) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    const spot = localSpots.find((item) => item.calledBy === barberName && item.status === 'called')
    localSpots = startSpot(spot?.id, localSpots)
    notifyLocalSubscribers()
    return spot?.id ?? null
  }
  const { data, error } = await supabase.rpc('staff_start', { p_pin: pin, p_barber: barberName })
  if (error) throw error
  return data
}

export async function staffDone(pin, barberName) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    const spot = localSpots.find((item) => item.calledBy === barberName && item.status === 'in_chair')
    localSpots = finishSpot(spot?.id, localSpots)
    notifyLocalSubscribers()
    return spot?.id ?? null
  }
  const { data, error } = await supabase.rpc('staff_done', { p_pin: pin, p_barber: barberName })
  if (error) throw error
  return data
}

export async function staffSetBreak(pin, barberName, onBreak) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    localBarberStates = { ...localBarberStates, [barberName]: onBreak ? 'break' : 'free' }
    for (const subscriber of localBarberSubscribers) subscriber({ ...localBarberStates })
    return true
  }
  const { data, error } = await supabase.rpc('staff_set_break', { p_pin: pin, p_barber: barberName, p_on_break: onBreak })
  if (error) throw error
  return data
}

export async function staffUpdateSpot(pin, spotId, action) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    if (action === 'no_show') localSpots = localSpots.map((spot) => spot.id === spotId && spot.status === 'called' && Date.now() - (spot.calledAt ?? spot.createdAt) >= 600000 ? { ...spot, status: 'no_show' } : spot)
    if (action === 'cancel') localSpots = localSpots.map((spot) => spot.id === spotId && ['waiting', 'called'].includes(spot.status) ? { ...spot, status: 'cancelled' } : spot)
    notifyLocalSubscribers()
    return true
  }
  const { data, error } = await supabase.rpc('staff_update_spot', { p_pin: pin, p_spot_id: spotId, p_action: action })
  if (error) throw error
  return data === true
}

export async function joinSpot(details) {
  if (!supabase) {
    const result = joinLocalQueue(localSpots, localNextTokenNumber, {
      ...details,
      id: globalThis.crypto?.randomUUID?.() ?? `spot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    })
    localSpots = result.spots
    localNextTokenNumber = result.nextNumber
    notifyLocalSubscribers()
    return { spot: result.spot, existing: result.existing }
  }

  const { data, error } = await supabase.rpc('join_queue', {
    p_customer_name: details.name,
    p_phone: details.phone,
    p_service_ids: details.serviceIds,
    p_preferred_barber: details.barber,
  })
  if (error) throw error
  if (data.cancel_key) window.localStorage.setItem(`${CANCEL_KEY_PREFIX}${data.spot.id}`, data.cancel_key)
  return { spot: normalizeSpot(data.spot), existing: Boolean(data.existing) }
}

export async function cancelSpot(spotId) {
  if (!supabase) {
    localSpots = localSpots.filter((spot) => spot.id !== spotId)
    notifyLocalSubscribers()
    return true
  }

  const cancelKey = window.localStorage.getItem(`${CANCEL_KEY_PREFIX}${spotId}`)
  if (!cancelKey) return false
  const { data, error } = await supabase.rpc('cancel_queue_spot', { p_spot_id: spotId, p_cancel_key: cancelKey })
  if (error) throw error
  if (data === true) window.localStorage.removeItem(`${CANCEL_KEY_PREFIX}${spotId}`)
  return data === true
}

export function subscribeToQueue(onUpdate, onError = console.error) {
  let active = true
  let channel
  const publish = (spots) => { if (active) onUpdate(spots) }

  const refresh = async () => {
    try {
      publish(await loadQueue())
    } catch (error) {
      if (active) onError(error)
    }
  }

  if (!supabase) {
    localSubscribers.add(publish)
    publish([...localSpots])
  } else {
    channel = supabase
      .channel('queue-spots-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_spots' }, refresh)
      .subscribe((status, error) => {
        if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) onError(error ?? new Error(`Queue realtime status: ${status}`))
      })
    refresh()
  }

  // Realtime delivers changes promptly; polling repairs missed events and reconnect gaps.
  const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
  return () => {
    active = false
    window.clearInterval(timer)
    localSubscribers.delete(publish)
    if (supabase && channel) supabase.removeChannel(channel)
  }
}

function normalizeSpot(row) {
  return {
    id: row.id,
    token: `S-${row.token}`,
    name: row.customer_name ?? '',
    serviceIds: row.service_ids,
    barber: row.preferred_barber,
    status: row.status,
    calledBy: row.called_barber,
    createdAt: new Date(row.created_at).getTime(),
    calledAt: row.called_at ? new Date(row.called_at).getTime() : null,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
  }
}

function notifyLocalSubscribers() {
  for (const subscriber of localSubscribers) subscriber([...localSpots])
}

const localBarberSubscribers = new Set()
