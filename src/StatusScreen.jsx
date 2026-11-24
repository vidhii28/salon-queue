import { useEffect, useState } from 'react'
import { ArrowLeft, BellRing, Clock3, Crown, MapPin, TicketCheck, X } from 'lucide-react'
import { getEstimatedWaitMinutes, getSpotPosition, isPreferredBarberOnBreak } from './queueRules.js'

function translated(template, values) {
  return Object.entries(values).reduce((value, [key, replacement]) => value.replace(`{${key}}`, replacement), template)
}

export default function StatusScreen({ spot, spots, barberStates, language, setLanguage, t, onHome, onCancel, isLoading, syncError, actionError }) {
  const [cancelPrompt, setCancelPrompt] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!spot && !isLoading) {
    return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#f8f2df] text-[#ad7f09]"><TicketCheck size={28}/></span>
      <h1 className="mt-5 font-serif text-3xl">{t.spotNotFound}</h1>
      <button onClick={onHome} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1f2937] px-5 font-bold text-white"><ArrowLeft size={16}/>{t.backHome}</button>
    </main>
  }

  if (!spot && isLoading) {
    return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center"><Clock3 size={32} className="text-[#ad7f09]"/><p className="mt-4 text-sm font-semibold text-slate-600">{t.loadingQueue}</p>{syncError && <p className="mt-3 text-xs text-amber-700">{syncError}</p>}</main>
  }

  const position = getSpotPosition(spot.id, spots)
  const baseWait = getEstimatedWaitMinutes(spot.id, spots, barberStates)
  const elapsed = Math.floor((now - spot.createdAt) / 60_000)
  const wait = Math.max(0, baseWait - elapsed)
  const called = ['called', 'in_chair'].includes(spot.status)
  const onBreak = isPreferredBarberOnBreak(spot, barberStates)

  if (called) {
    return <main className="fixed inset-0 z-30 flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-[#d4a017] px-6 py-10 text-center text-[#1f2937]">
      <div className="absolute right-5 top-5 flex rounded-full border border-[#1f2937]/20 bg-white/25 p-1 text-xs font-extrabold shadow-sm">
        {['en', 'hi'].map((lang) => <button key={lang} onClick={() => setLanguage(lang)} className={`min-w-10 rounded-full px-2.5 py-1.5 uppercase ${language === lang ? 'bg-[#1f2937] text-white' : 'text-[#1f2937]'}`}>{lang}</button>)}
      </div>
      <span className="grid h-24 w-24 place-items-center rounded-full border border-[#1f2937]/15 bg-white/25"><BellRing size={42}/></span>
      <p className="mt-8 text-xs font-extrabold uppercase tracking-[.24em]">{spot.token}</p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-6xl">{translated(t.calledTitle, { barber: spot.calledBy })}</h1>
      <button onClick={onHome} className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1f2937] px-5 font-bold text-white"><ArrowLeft size={16}/>{t.backHome}</button>
      <button onClick={() => setCancelPrompt(true)} className="mt-4 min-h-11 rounded-xl border border-[#1f2937]/30 px-5 text-sm font-bold">{t.cancelSpot}</button>
      {cancelPrompt && <div className="fixed inset-0 z-40 grid place-items-center bg-[#111827]/65 p-5" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="called-cancel-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-left text-[#1f2937] shadow-2xl"><h2 id="called-cancel-title" className="font-serif text-2xl">{t.cancelTitle}</h2><p className="mt-2 text-sm text-slate-500">{t.cancelMessage}</p>{actionError && <p className="mt-3 text-sm font-semibold text-rose-700">{actionError}</p>}<div className="mt-6 flex flex-col gap-2"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#1f2937] px-4 text-sm font-bold text-white">{t.confirmCancel}</button><button onClick={() => setCancelPrompt(false)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">{t.keepSpot}</button></div></section></div>}
    </main>
  }

  return <main className="mx-auto max-w-3xl px-5 pb-12 sm:px-8">
    <div className="mb-6 mt-2"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ad7f09]">{spot.token}</p><h1 className="mt-2 font-serif text-4xl sm:text-5xl">{t.statusTitle}</h1>{syncError && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{syncError}</p>}</div>
    <section className="overflow-hidden rounded-[2rem] bg-[#1f2937] text-white shadow-xl shadow-slate-900/15">
      <div className="flex flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10">
        <div className="grid h-24 w-24 place-items-center rounded-full border border-[#d4a017]/50 bg-[#d4a017]/10 text-[#e6bc4a]"><Crown size={35}/></div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">{t.tokenLabel}</p>
        <p className="mt-1 font-serif text-5xl font-semibold tracking-wide text-[#e6bc4a]">{spot.token}</p>
        {position === 2 && <div className="mt-5 flex max-w-md items-center gap-3 rounded-2xl border border-[#d4a017]/35 bg-[#d4a017]/10 px-4 py-3 text-left text-sm font-semibold text-[#f4d982]"><MapPin size={19} className="shrink-0"/>{t.startComing}</div>}
        <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{t.positionLabel}</p><p className="mt-2 font-serif text-3xl font-semibold">{position ?? '—'}</p><p className="mt-1 text-xs text-slate-400">{position === 1 ? t.nextInLine : t.waitingAhead}</p></div>
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{t.waitEstimate}</p><div className="mt-2 flex items-center justify-center gap-2 font-serif text-3xl font-semibold text-[#e6bc4a]"><Clock3 size={22}/>{t.about} {wait} {t.minutes}</div><p className="mt-1 text-xs text-slate-400">{t.liveEstimate}</p></div>
        </div>
        {onBreak && <p role="status" className="mt-5 w-full rounded-xl border border-amber-300/20 bg-amber-100/10 px-4 py-3 text-sm font-semibold text-amber-100">{translated(t.barberBreak, { barber: spot.barber })}</p>}
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-center">
        <button onClick={() => setCancelPrompt(true)} className="min-h-12 rounded-xl border border-white/20 px-5 text-sm font-bold text-white transition hover:bg-white/10">{t.cancelSpot}</button>
      </div>
    </section>

    {cancelPrompt && <div className="fixed inset-0 z-40 grid place-items-center bg-[#111827]/65 p-5" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><button onClick={() => setCancelPrompt(false)} className="float-right grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600" aria-label={t.keepSpot}><X size={17}/></button><h2 id="cancel-title" className="font-serif text-2xl">{t.cancelTitle}</h2><p className="mt-2 text-sm text-slate-500">{t.cancelMessage}</p>{actionError && <p className="mt-3 text-sm font-semibold text-rose-700">{actionError}</p>}<div className="mt-6 flex flex-col gap-2"><button onClick={onCancel} className="min-h-12 rounded-xl bg-[#1f2937] px-4 text-sm font-bold text-white">{t.confirmCancel}</button><button onClick={() => setCancelPrompt(false)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">{t.keepSpot}</button></div></section></div>}
  </main>
}
