import { useEffect, useState } from 'react'
import { BARBERS } from './queueRules.js'
import { ownerCopy } from './ownerCopy.js'

export default function AdminScreen({ language, settings, loading, onSave, onLoadStats, syncError }) {
  const t = ownerCopy[language]
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [denied, setDenied] = useState(false)
  const [draft, setDraft] = useState(settings)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ customersServed: 0, averageWait: 0, noShows: 0 })
  const [statsError, setStatsError] = useState(false)
  useEffect(() => { if (!dirty) setDraft(settings) }, [settings, dirty])
  useEffect(() => {
    if (!unlocked) return undefined
    let active = true
    const refresh = async () => { try { const next = await onLoadStats(pin); if (active) { setStats(next); setStatsError(false) } } catch { if (active) setStatsError(true) } }
    refresh()
    const timer = window.setInterval(refresh, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [unlocked, pin, onLoadStats])
  const submitPin = (event) => { event.preventDefault(); if (pin === '1234') { setUnlocked(true); setDenied(false) } else { setDenied(true); setPin('') } }
  const update = (change) => { setDraft((current) => ({ ...current, ...change })); setDirty(true); setSaved(false); setError('') }
  const updateService = (id, change) => update({ services: draft.services.map((service) => service.id === id ? { ...service, ...change } : service) })
  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    try { const result = await onSave(pin, draft); setDraft(result); setDirty(false); setSaved(true) }
    catch { setError(t.saveError) }
    finally { setSaving(false) }
  }
  if (!unlocked) return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-5"><form onSubmit={submitPin} className="w-full rounded-3xl bg-white p-8 shadow-xl"><h1 className="font-serif text-3xl">{t.pinTitle}</h1><p className="mt-2 text-sm text-slate-500">{t.pinPrompt}</p><input aria-label={t.pin} autoComplete="off" inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-5 min-h-14 w-full rounded-xl border px-4 text-2xl tracking-[.5em]"/><p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-rose-700">{denied ? t.denied : ''}</p><button className="min-h-12 w-full rounded-xl bg-[#1f2937] font-bold text-white">{t.unlock}</button></form></main>
  if (loading) return <main className="mx-auto max-w-5xl px-5 py-12 text-center text-slate-500">{t.loading}</main>
  return <main className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#ad7f09]">{t.title}</p><h1 className="mt-1 font-serif text-4xl">{t.subtitle}</h1></div><button disabled={!dirty || saving} onClick={save} className="min-h-12 rounded-xl bg-[#d4a017] px-5 font-bold text-[#1f2937] disabled:opacity-50">{saving ? t.saving : saved ? t.saved : t.save}</button></div>
    {syncError && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{syncError}</p>}
    {(error || statsError) && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error || t.statsError}</p>}
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
      <section className="space-y-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"><h2 className="font-serif text-2xl">{t.services}</h2><div className="mt-4 space-y-4">{draft.services.map((service) => <article key={service.id} className="rounded-2xl border border-slate-100 bg-[#fcfbf8] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">{service.nameEn}</h3><button type="button" role="switch" aria-checked={service.enabled} onClick={() => updateService(service.id, { enabled: !service.enabled })} className={`min-h-11 min-w-24 rounded-full px-4 text-sm font-bold ${service.enabled ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'}`}>{service.enabled ? t.enabled : t.disabled}</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">{t.serviceEn}<input value={service.nameEn} onChange={(e) => updateService(service.id, { nameEn: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-bold text-slate-600">{t.serviceHi}<input lang="hi" value={service.nameHi} onChange={(e) => updateService(service.id, { nameHi: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-bold text-slate-600">{t.minutes}<input type="number" min="1" step="1" value={service.minutes} onChange={(e) => updateService(service.id, { minutes: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/></label><label className="text-xs font-bold text-slate-600">{t.price}<input type="number" min="0" step="1" value={service.price} onChange={(e) => updateService(service.id, { price: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/></label></div></article>)}</div></div>
        <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"><h2 className="font-serif text-2xl">{t.barbers}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{BARBERS.map((barber) => {const onDuty = Boolean(draft.barbers[barber.name]); return <button key={barber.name} type="button" role="switch" aria-checked={onDuty} onClick={() => update({ barbers: { ...draft.barbers, [barber.name]: !onDuty } })} className={`flex min-h-14 items-center justify-between rounded-2xl px-4 font-bold ${onDuty ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}><span>{barber.name}</span><span>{onDuty ? t.enabled : t.disabled}</span></button>})}</div></div>
      </section>
      <aside className="space-y-5">
        <section className="rounded-3xl bg-[#1f2937] p-6 text-white shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#e6bc4a]">{t.queue}</p><h2 className="mt-2 font-serif text-3xl">{draft.queueOpen ? t.open : t.closed}</h2></div><span className="h-4 w-4 rounded-full bg-[#d4a017]" aria-hidden="true"></span></div><div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1"><button type="button" aria-pressed={draft.queueOpen} onClick={() => update({ queueOpen: true })} className={`min-h-12 rounded-xl font-bold ${draft.queueOpen ? 'bg-[#d4a017] text-[#1f2937]' : 'text-white'}`}>{t.open}</button><button type="button" aria-pressed={!draft.queueOpen} onClick={() => update({ queueOpen: false })} className={`min-h-12 rounded-xl font-bold ${!draft.queueOpen ? 'bg-[#d4a017] text-[#1f2937]' : 'text-white'}`}>{t.closed}</button></div></section>
        <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="font-serif text-2xl">{t.stats}</h2><div className="mt-4 grid gap-3">{[[t.served, stats.customersServed], [t.averageWait, `${stats.averageWait} ${t.min}`], [t.noShows, stats.noShows]].map(([label, value]) => <article key={label} className="flex items-center justify-between rounded-2xl bg-[#f7f5ef] p-4"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="font-serif text-3xl font-bold">{value}</p></article>)}</div></section>
      </aside>
    </div>
  </main>
}
