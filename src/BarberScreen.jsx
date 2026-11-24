import { Component, useEffect, useState } from 'react'
import { BARBERS, getNextForBarber } from './queueRules.js'
import { staffCopy } from './staffCopy.js'
import { staffDone, staffSetBreak, staffStart, subscribeToBarberStates, subscribeToStaffQueue } from './queueData.js'

const errorCopy = {
  en: { title: 'Barber View could not load', retry: 'Try again' },
  hi: { title: '\u092c\u093e\u0930\u094d\u092c\u0930 \u0935\u094d\u092f\u0942 \u0932\u094b\u0921 \u0928\u0939\u0940\u0902 \u0939\u094b \u0938\u0915\u093e', retry: '\u092b\u093f\u0930 \u0938\u0947 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902' },
}

class BarberViewErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    const copy = errorCopy[this.props.language] ?? errorCopy.en
    const message = typeof this.state.error?.message === 'string' && this.state.error.message
      ? this.state.error.message
      : String(this.state.error)
    return <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 py-10 text-center"><section className="w-full rounded-3xl border border-rose-200 bg-white p-6 shadow-lg"><h1 className="font-serif text-2xl font-bold text-rose-900">{copy.title}</h1><p role="alert" className="mt-3 break-words text-sm text-rose-800">{message}</p><button type="button" onClick={() => this.setState({ error: null })} className="mt-5 min-h-12 rounded-xl bg-[#1f2937] px-5 font-bold text-white">{copy.retry}</button></section></main>
  }
}

export default function BarberScreen({ barberName, language }) {
  return <BarberViewErrorBoundary language={language}><BarberScreenContent barberName={barberName} language={language} /></BarberViewErrorBoundary>
}

function BarberScreenContent({ barberName, language }) {
  const t = staffCopy[language] ?? staffCopy.en
  const barber = BARBERS.find((item) => item.name.toLowerCase() === String(barberName ?? '').toLowerCase())
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [denied, setDenied] = useState(false)
  const [rawSpots, setSpots] = useState([])
  const [rawStates, setStates] = useState(() => Object.fromEntries(BARBERS.map(({ name, state }) => [name, state])))
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!unlocked) return undefined
    const stopQueue = subscribeToStaffQueue(pin, (nextSpots) => setSpots(Array.isArray(nextSpots) ? nextSpots : []), () => setError(t.syncError))
    const stopStates = subscribeToBarberStates((nextStates) => setStates(nextStates && typeof nextStates === 'object' ? nextStates : {}), () => setError(t.syncError))
    return () => { stopQueue(); stopStates() }
  }, [unlocked, pin, t.syncError])

  if (!barber) return <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 text-center"><p className="text-xl font-bold">{t.barberNotFound}</p></main>
  const submitPin = (event) => { event.preventDefault(); if (pin === '1234') { setUnlocked(true); setDenied(false) } else { setDenied(true); setPin('') } }
  if (!unlocked) return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-5"><form onSubmit={submitPin} className="w-full rounded-3xl bg-white p-8 shadow-xl"><h1 className="font-serif text-3xl">{barber.name} · {t.pinTitle}</h1><p className="mt-2 text-sm text-slate-500">{t.pinPrompt}</p><input aria-label={t.pin} autoComplete="off" inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-5 min-h-14 w-full rounded-xl border px-4 text-2xl tracking-[.5em]"/><p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-rose-700">{denied ? t.denied : ''}</p><button className="min-h-12 w-full rounded-xl bg-[#1f2937] font-bold text-white">{t.unlock}</button></form></main>

  const spots = rawSpots.filter((spot) => spot && typeof spot === 'object').map((spot) => ({
    ...spot,
    serviceIds: Array.isArray(spot.serviceIds) ? spot.serviceIds : [],
  }))
  const states = rawStates && typeof rawStates === 'object' ? rawStates : {}
  const current = spots.find((spot) => spot.calledBy === barber.name && ['called', 'in_chair'].includes(spot.status))
  const next = getNextForBarber(barber.name, spots, states)
  const startedAt = Number(current?.startedAt)
  const elapsed = Number.isFinite(startedAt) && startedAt > 0 ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')
  const serviceNames = (spot) => (Array.isArray(spot?.serviceIds) ? spot.serviceIds : []).map((id) => t[id] ?? String(id ?? '')).filter(Boolean).join(', ') || '—'
  const act = async (action) => { setError(''); try { await action(pin, barber.name) } catch { setError(t.actionError) } }
  const breaking = states[barber.name] === 'break'

  return <main className="mx-auto max-w-lg px-5 pb-10">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#ad7f09]">{barber.name}</p><h1 className="mt-1 font-serif text-3xl">{t.current}</h1></div><span className={`rounded-full px-3 py-2 text-xs font-bold ${breaking ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{breaking ? t.onBreak : t.available}</span></div>
    {current ? <section className="rounded-3xl bg-[#1f2937] p-6 text-white shadow-xl"><p className="text-xs font-bold uppercase tracking-widest text-[#e6bc4a]">{current.token ?? '—'}</p><h2 className="mt-2 font-serif text-3xl">{current.name || '—'}</h2><p className="mt-2 text-slate-300">{serviceNames(current)}</p><div className="mt-6 rounded-2xl bg-white/10 p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-slate-300">{t.sinceStart}</p><p className="mt-2 font-mono text-5xl font-bold tabular-nums">{minutes}:{seconds}</p></div>{current.status === 'called' ? <button onClick={() => act(staffStart)} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d4a017] text-lg font-extrabold text-[#1f2937]">{t.start}</button> : <button onClick={() => act(staffDone)} className="mt-5 min-h-14 w-full rounded-2xl bg-emerald-500 text-lg font-extrabold text-white">{t.done}</button>}</section> : <section className="grid min-h-48 place-items-center rounded-3xl bg-white p-6 text-center shadow-sm"><p className="font-serif text-2xl text-slate-500">{t.emptyBarber}</p></section>}
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.next}</p><p className="mt-2 text-lg font-semibold">{next ? <>{next.token ?? '—'} · {next.name || '—'} <span className="block text-sm font-normal text-slate-500">{serviceNames(next)}</span></> : t.queueEmpty}</p></section>
    <button onClick={() => act((staffPin, name) => staffSetBreak(staffPin, name, !breaking))} className={`mt-4 min-h-14 w-full rounded-2xl border-2 text-base font-extrabold ${breaking ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-amber-500 bg-amber-50 text-amber-900'}`}>{breaking ? t.setAvailable : t.setBreak}</button>
    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
  </main>
}
