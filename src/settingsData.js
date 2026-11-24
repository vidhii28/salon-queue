import { normalizeSettings } from './queueRules.js'
import { supabase } from './supabaseClient.js'

const POLL_INTERVAL_MS = 3000
let localSettings = normalizeSettings(null)
let localSpots = []

export async function loadSettings() {
  if (!supabase) return normalizeSettings(localSettings)
  const { data, error } = await supabase.from('salon_settings').select('queue_open,services,barbers').eq('id', true).single()
  if (error) throw error
  return normalizeSettings(data)
}

export function subscribeToSettings(onUpdate, onError = console.error) {
  let active = true
  let channel
  const refresh = async () => {
    try { const next = await loadSettings(); if (active) onUpdate(next) }
    catch (error) { if (active) onError(error) }
  }
  if (supabase) {
    channel = supabase.channel('salon-settings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_settings' }, refresh)
      .subscribe()
  }
  refresh()
  const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
  return () => { active = false; window.clearInterval(timer); if (channel) supabase.removeChannel(channel) }
}

export async function saveSettings(pin, settings) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    localSettings = normalizeSettings(settings)
    return normalizeSettings(localSettings)
  }
  const services = settings.services.map(({ id, nameEn, nameHi, minutes, price, enabled }) => ({
    id, name_en: nameEn, name_hi: nameHi, minutes: Number(minutes), price: Number(price), enabled: Boolean(enabled),
  }))
  const { data, error } = await supabase.rpc('admin_save_settings', {
    p_pin: pin,
    p_queue_open: Boolean(settings.queueOpen),
    p_services: services,
    p_barbers: settings.barbers,
  })
  if (error) throw error
  return normalizeSettings(data)
}

export async function loadTodayStats(pin) {
  if (pin !== '1234') throw new Error('Access denied')
  if (!supabase) {
    const done = localSpots.filter((spot) => spot.status === 'done')
    const waits = done.map((spot) => Math.max(0, (spot.calledAt ?? spot.createdAt) - spot.createdAt) / 60_000)
    return { customersServed: done.length, averageWait: waits.length ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length) : 0, noShows: localSpots.filter((spot) => spot.status === 'no_show').length }
  }
  const { data, error } = await supabase.rpc('admin_today_stats', { p_pin: pin })
  if (error) throw error
  return { customersServed: data.customers_served ?? 0, averageWait: Math.round(data.average_wait_minutes ?? 0), noShows: data.no_shows ?? 0 }
}

export function setLocalStatsSpots(spots) { localSpots = spots }
