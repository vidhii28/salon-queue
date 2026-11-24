import { useEffect, useState } from 'react'
import { BARBERS, SERVICES, getNextForBarber } from './queueRules.js'
import { staffCopy } from './staffCopy.js'
import { staffDone, staffSetBreak, staffStart, subscribeToBarberStates, subscribeToStaffQueue } from './queueData.js'

export default function BarberScreen({ barberName, language }) {
  const t = staffCopy[language]
  const barber = BARBERS.find((item) => item.name.toLowerCase() === barberName?.toLowerCase())
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [denied, setDenied] = useState(false)
  const [spots, setSpots] = useState([])
  const [states, setStates] = useState(Object.fromEntries(BARBERS.map(({ name, state }) => [name, state])))
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    if (!unlocked) return undefined
    const stopQueue = subscribeToStaffQueue(pin, setSpots, () => setError(t.syncError))
    const stopStates = subscribeToBarberStates(setStates, () => setError(t.syncError))
    return () => { stopQueue(); stopStates() }
  }, [unlocked, pin, t.syncError])
  if (!barber) return <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 text-center"><p className="text-xl font-bold">{t.barberNotFound}</p></main>
  const submitPin = (event) => { event.preventDefault(); if (pin === '1234') { setUnlocked(true); setDenied(false) } else { setDenied(true); setPin('') } }
  if (!unlocked) return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-5"><form onSubmit={submitPin} className="w-full rounded-3xl bg-white p-8 shadow-xl"><h1 className="font-serif text-3xl">{barber.name} · {t.pinTitle}</h1><p className="mt-2 text-sm text-slate-500">{t.pinPrompt}</p><input aria-label={t.pin} autoComplete="off" inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-5 min-h-14 w-full rounded-xl border px-4 text-2xl tracking-[.5em]"/><p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-rose-700">{denied ? t.denied : ''}</p><button className="min-h-12 w-full rounded-xl bg-[#1f2937] font-bold text-white">{t.unlock}</button></form></main>
  const current = spots.find((spot) => spot.calledBy === barber.name && ['called', 'in_chair'].includes(spot.status))
  const next = getNextForBarber(barber.name, spots, states)
  const elapsed = current?.startedAt ? Math.max(0, Math.floor((now - current.startedAt) / 1000)) : 0
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')
  const serviceNames = (spot) => spot.serviceIds.map((id) => t[id] ?? id).join(', ')
  const act = async (action) => { setError(''); try { await action(pin, barber.name) } catch { setError(t.actionError) } }
  const breaking = states[barber.name] === 'break'
  return <main className="mx-auto max-w-lg px-5 pb-10">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#ad7f09]">{barber.name}</p><h1 className="mt-1 font-serif text-3xl">{t.current}</h1></div><span className={`rounded-full px-3 py-2 text-xs font-bold ${breaking ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{breaking ? t.onBreak : t.available}</span></div>
    {current ? <section className="rounded-3xl bg-[#1f2937] p-6 text-white shadow-xl"><p className="text-xs font-bold uppercase tracking-widest text-[#e6bc4a]">{current.token}</p><h2 className="mt-2 font-serif text-3xl">{current.name}</h2><p className="mt-2 text-slate-300">{serviceNames(current)}</p><div className="mt-6 rounded-2xl bg-white/10 p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-slate-300">{t.sinceStart}</p><p className="mt-2 font-mono text-5xl font-bold tabular-nums">{minutes}:{seconds}</p></div>{current.status === 'called' ? <button onClick={() => act(staffStart)} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d4a017] text-lg font-extrabold text-[#1f2937]">{t.start}</button> : <button onClick={() => act(staffDone)} className="mt-5 min-h-14 w-full rounded-2xl bg-emerald-500 text-lg font-extrabold text-white">{t.done}</button>}</section> : <section className="grid min-h-48 place-items-center rounded-3xl bg-white p-6 text-center shadow-sm"><p className="font-serif text-2xl text-slate-500">{t.emptyBarber}</p></section>}
    <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.next}</p><p className="mt-2 text-lg font-semibold">{next ? <>{next.token} · {next.name} <span className="block text-sm font-normal text-slate-500">{serviceNames(next)}</span></> : t.queueEmpty}</p></section>
    <button onClick={() => act((staffPin, name) => staffSetBreak(staffPin, name, !breaking))} className={`mt-4 min-h-14 w-full rounded-2xl border-2 text-base font-extrabold ${breaking ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-amber-500 bg-amber-50 text-amber-900'}`}>{breaking ? t.setAvailable : t.setBreak}</button>
    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
  </main>
}
