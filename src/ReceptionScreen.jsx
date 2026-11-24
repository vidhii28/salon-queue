import { useEffect, useState } from 'react'
import { BARBERS, SERVICES, getWaitingSpots } from './queueRules.js'
import { subscribeToStaffQueue } from './queueData.js'

export default function ReceptionScreen({ spots, barberStates, barberOnDuty = {}, language, t, onCallNext, onNoShow, onCancel, onWalkIn, error }) {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [denied, setDenied] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [services, setServices] = useState([])
  const [now, setNow] = useState(Date.now())
  const [staffSpots, setStaffSpots] = useState(spots)
  const [staffError, setStaffError] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!unlocked) return undefined
    return subscribeToStaffQueue(pin, setStaffSpots)
  }, [unlocked, pin])

  const queue = staffSpots.length ? staffSpots : spots
  const waiting = getWaitingSpots(queue)
  const queueRows = queue
    .filter((spot) => ['waiting', 'called'].includes(spot.status))
    .sort((a, b) => Number(a.token.replace('S-', '')) - Number(b.token.replace('S-', '')))
  const current = (barber) => queue.find((spot) => spot.calledBy === barber && ['called', 'in_chair'].includes(spot.status))
  const runStaffAction = async (action) => {
    setStaffError('')
    try { await action() } catch { setStaffError(t.queueError) }
  }
  const unlock = (event) => {
    event.preventDefault()
    if (pin === '1234') { setUnlocked(true); setDenied(false) }
    else { setDenied(true); setPin('') }
  }

  if (!unlocked) return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 sm:px-5">
    <form onSubmit={unlock} className="w-full rounded-3xl bg-white p-6 shadow-xl sm:p-8">
      <h1 className="font-serif text-3xl">{t.reception}</h1>
      <p className="mt-2 text-sm text-slate-500">{t.pinPrompt}</p>
      <input aria-label={t.pin} autoComplete="off" inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-5 min-h-14 w-full rounded-xl border px-4 text-2xl tracking-[.5em]" />
      <p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-rose-700">{denied ? t.pinDenied : ''}</p>
      <button className="min-h-12 w-full rounded-xl bg-[#1f2937] font-bold text-white">{t.unlock}</button>
    </form>
  </main>

  return <main className="mx-auto w-full max-w-[1500px] min-w-0 px-3 pb-8 sm:px-5">
    <div className="mb-5 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-[#ad7f09]">{t.reception}</p><h1 className="mt-1 font-serif text-2xl sm:text-3xl">{t.queueDesk}</h1></div>
      <button onClick={() => setAdding(true)} className="min-h-12 w-full shrink-0 whitespace-nowrap rounded-xl bg-[#d4a017] px-4 text-sm font-bold text-[#1f2937] sm:w-auto sm:px-5 sm:text-base">+ {t.addWalkIn}</button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
    {staffError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{staffError}</p>}

    <div className="grid min-w-0 grid-cols-1 gap-5">
      <section className="min-w-0">
        <h2 className="mb-3 font-serif text-xl">{t.barbers}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {BARBERS.map((barber) => {
            const spot = current(barber.name)
            const state = barberStates[barber.name] === 'break' ? 'break' : spot ? 'busy' : 'free'
            const elapsed = spot ? Math.max(0, Math.ceil(((spot.calledAt ?? spot.createdAt) + spot.serviceIds.reduce((sum, id) => sum + (SERVICES.find((service) => service.id === id)?.minutes ?? 0), 0) * 60_000 - now) / 60_000)) : null
            const canCall = !spot && barberStates[barber.name] !== 'break' && barberOnDuty[barber.name] && waiting.some((item) => item.barber === 'any' || item.barber === barber.name)
            return <article key={barber.name} className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-bold">{barber.name}</h3><span className="text-xs font-semibold text-slate-500">{t[state]}</span></div>
              {spot ? <><p className="mt-3 text-sm text-slate-500">{t.currentCustomer}</p><p className="break-words font-semibold">{spot.token} · {spot.name}</p><p className="mt-1 text-sm">{t.timeLeft}: {elapsed} {t.minutes}</p></> : <p className="mt-4 text-sm text-slate-500">{t.noCurrentCustomer}</p>}
              <button disabled={!canCall} onClick={() => runStaffAction(() => onCallNext(barber.name, pin))} className="mt-4 min-h-11 w-full rounded-xl bg-[#1f2937] px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{t.callNext}</button>
            </article>
          })}
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-serif text-xl">{t.waitingList}</h2><span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold">{waiting.length}</span></div>
        {queueRows.length ? <>
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm md:block">
            <table className="w-full table-fixed text-left text-xs lg:text-sm">
              <colgroup><col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[23%]" /><col className="w-[16%]" /><col className="w-[12%]" /><col className="w-[24%]" /></colgroup>
              <thead className="bg-[#1f2937] text-[10px] uppercase tracking-wide text-white lg:text-xs"><tr>{[t.token, t.nameHeader, t.servicesHeader, t.preferredBarber, t.waitingTime, t.actions].map((heading) => <th key={heading} className="break-words px-2 py-3">{heading}</th>)}</tr></thead>
              <tbody>{queueRows.map((spot) => {
                const age = Math.floor((now - spot.createdAt) / 60_000)
                const canNoShow = spot.status === 'called' && now - (spot.calledAt ?? spot.createdAt) >= 600_000
                return <tr key={spot.id} className={`border-b border-slate-100 ${age > 60 ? 'bg-amber-100' : ''}`}>
                  <td className="break-words px-2 py-3 font-bold">{spot.token}</td><td className="break-words px-2 py-3">{spot.name}</td><td className="break-words px-2 py-3">{spot.serviceIds.map((id) => t[id]).join(', ')}</td><td className="break-words px-2 py-3">{spot.barber === 'any' ? t.any : spot.barber}</td><td className="break-words px-2 py-3">{age} {t.minutes}</td>
                  <td className="px-2 py-2"><div className="flex flex-wrap gap-1.5"><button disabled={!canNoShow} onClick={() => runStaffAction(() => onNoShow(spot.id, pin))} className="min-h-11 flex-1 rounded-lg bg-amber-100 px-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40 lg:text-xs">{t.noShow}</button><button onClick={() => runStaffAction(() => onCancel(spot.id, pin))} className="min-h-11 flex-1 rounded-lg bg-rose-50 px-2 text-[10px] font-bold text-rose-800 lg:text-xs">{t.cancel}</button></div></td>
                </tr>
              })}</tbody>
            </table>
          </div>

          <div className="grid min-w-0 gap-3 md:hidden">
            {queueRows.map((spot) => {
              const age = Math.floor((now - spot.createdAt) / 60_000)
              const canNoShow = spot.status === 'called' && now - (spot.calledAt ?? spot.createdAt) >= 600_000
              return <article key={spot.id} className={`min-w-0 rounded-2xl border border-slate-100 p-4 shadow-sm ${age > 60 ? 'bg-amber-100' : 'bg-white'}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.token}</p><p className="text-xl font-extrabold">{spot.token}</p></div><div className="max-w-[65%] min-w-0 text-right"><p className="text-xs font-bold text-slate-500">{t.nameHeader}</p><p className="break-words text-lg font-bold">{spot.name}</p></div></div>
                <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{t.servicesHeader}</dt><dd className="break-words font-medium">{spot.serviceIds.map((id) => t[id]).join(', ')}</dd></div>
                  <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{t.preferredBarber}</dt><dd className="break-words font-medium">{spot.barber === 'any' ? t.any : spot.barber}</dd></div>
                  <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{t.waitingTime}</dt><dd className="font-medium">{age} {t.minutes}</dd></div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={!canNoShow} onClick={() => runStaffAction(() => onNoShow(spot.id, pin))} className="min-h-11 rounded-xl bg-amber-100 px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">{t.noShow}</button><button onClick={() => runStaffAction(() => onCancel(spot.id, pin))} className="min-h-11 rounded-xl bg-rose-50 px-3 text-sm font-bold text-rose-800">{t.cancel}</button></div>
              </article>
            })}
          </div>
        </> : <div className="grid min-h-48 place-items-center rounded-2xl bg-white text-lg font-semibold text-slate-500">{t.noOneWaiting}</div>}
      </section>
    </div>

    {adding && <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-3 sm:grid sm:place-items-center sm:p-4">
      <form onSubmit={(event) => { event.preventDefault(); onWalkIn({ name, phone, serviceIds: services }); setAdding(false); setName(''); setPhone(''); setServices([]) }} className="mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl sm:text-2xl">{t.addWalkIn}</h2><button type="button" aria-label={t.cancel} onClick={() => setAdding(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-xl">×</button></div>
        <label className="mt-4 block text-sm font-semibold">{t.name}<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border px-3" /></label>
        <label className="mt-3 block text-sm font-semibold">{t.phone}<input required inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 min-h-12 w-full rounded-xl border px-3" /></label>
        <fieldset className="mt-4"><legend className="text-sm font-semibold">{t.services}</legend><div className="mt-2 flex flex-wrap gap-2">{SERVICES.map((service) => <label key={service.id} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={services.includes(service.id)} onChange={() => setServices((currentServices) => currentServices.includes(service.id) ? currentServices.filter((id) => id !== service.id) : currentServices.length < 3 ? [...currentServices, service.id] : currentServices)} />{t[service.id]}</label>)}</div></fieldset>
        <button className="mt-5 min-h-12 w-full rounded-xl bg-[#d4a017] px-4 font-bold text-[#1f2937]">{t.confirmWalkIn}</button>
      </form>
    </div>}
  </main>
}
