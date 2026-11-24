import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, Crown, Scissors, Sparkles, UserRound, UsersRound } from 'lucide-react'
import { copy } from './translations.js'
import StatusScreen from './StatusScreen.jsx'
import ReceptionScreen from './ReceptionScreen.jsx'
import BarberScreen from './BarberScreen.jsx'
import DisplayScreen from './DisplayScreen.jsx'
import AdminScreen from './AdminScreen.jsx'
import { ownerCopy } from './ownerCopy.js'
import { BARBERS, MAX_SERVICES_PER_SPOT, calculateServiceTotals, createDefaultSettings, getEstimatedWaitMinutes, getWaitingSpots, isValidPhone } from './queueRules.js'
import { cancelSpot, getSpotById, joinSpot, staffCallNext, staffUpdateSpot, subscribeToBarberStates, subscribeToQueue } from './queueData.js'
import { loadTodayStats, saveSettings, setLocalStatsSpots, subscribeToSettings } from './settingsData.js'

const serviceIcons = { haircut: Scissors, beard: UserRound, spa: Sparkles }
const barberData = BARBERS

function App() {
  const [language, setLanguage] = useState('en')
  const [path, setPath] = useState(window.location.pathname)
  const [settings, setSettings] = useState(createDefaultSettings)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [spots, setSpots] = useState([])
  const [queueLoaded, setQueueLoaded] = useState(false)
  const [queueSyncError, setQueueSyncError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [barberStates, setBarberStates] = useState(() => Object.fromEntries(BARBERS.map(({ name, state }) => [name, state])))
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedBarber, setSelectedBarber] = useState('any')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [walkInError, setWalkInError] = useState('')
  const t = { ...copy[language], ...Object.fromEntries(settings.services.map((service) => [service.id, language === 'hi' ? service.nameHi : service.nameEn])) }

  const navigate = (next) => {
    window.history.pushState({}, '', next)
    setPath(next)
    setError('')
    setResult(null)
    setActionError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => subscribeToQueue((nextSpots) => {
    setSpots(nextSpots)
    setLocalStatsSpots(nextSpots)
    setQueueLoaded(true)
    setQueueSyncError(false)
  }, () => setQueueSyncError(true)), [])

  useEffect(() => subscribeToBarberStates(setBarberStates, () => setQueueSyncError(true)), [])

  useEffect(() => subscribeToSettings((nextSettings) => {
    setSettings(nextSettings)
    setSettingsLoading(false)
  }, () => { setSettingsLoading(false); setQueueSyncError(true) }), [])

  const activeServices = settings.services.filter((service) => service.enabled)
  const joinServices = activeServices.map((service) => ({ ...service, icon: serviceIcons[service.id] }))
  const serviceData = joinServices
  const serviceCatalog = settings.services
  const activeBarbers = barberData.filter((barber) => settings.barbers[barber.name])
  const queueOpen = settings.queueOpen
  const onlineQueueReady = !settingsLoading && queueOpen
  const effectiveBarberStates = Object.fromEntries(BARBERS.map(({ name }) => [name, settings.barbers[name] ? barberStates[name] : 'off']))
  const totals = calculateServiceTotals(selectedServices, serviceCatalog)
  const waitingSpots = getWaitingSpots(spots)
  const homeWait = waitingSpots.length ? getEstimatedWaitMinutes(waitingSpots.at(-1).id, spots, effectiveBarberStates) : 0
  const expectedWait = Math.max(10, Math.round(homeWait * (totals.minutes || 30) / 30))

  useEffect(() => {
    const enabledIds = new Set(activeServices.map((service) => service.id))
    setSelectedServices((current) => current.filter((id) => enabledIds.has(id)))
  }, [settings.services])
  useEffect(() => {
    if (selectedBarber !== 'any' && !settings.barbers[selectedBarber]) setSelectedBarber('any')
  }, [settings.barbers, selectedBarber])

  const toggleService = (id) => {
    setError('')
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((serviceId) => serviceId !== id))
    } else if (selectedServices.length < MAX_SERVICES_PER_SPOT && activeServices.some((service) => service.id === id)) {
      setSelectedServices([...selectedServices, id])
    } else {
      setError('maxError')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!onlineQueueReady) return setError('onlineClosedError')
    if (!name.trim()) return setError('nameError')
    if (!isValidPhone(phone)) return setError('phoneError')
    if (!selectedServices.length) return setError('serviceError')
    try {
      const joined = await joinSpot({ name: name.trim(), phone, serviceIds: selectedServices, barber: selectedBarber })
      setSpots((current) => current.some((spot) => spot.id === joined.spot.id)
        ? current.map((spot) => spot.id === joined.spot.id ? joined.spot : spot)
        : [...current, joined.spot])
      navigate(`/status/${joined.spot.id}`)
    } catch (joinError) {
      console.error('Could not join the queue:', joinError)
      setError('queueError')
    }
  }

  const statusId = path.match(/^\/status\/([^/]+)$/)?.[1]
  const statusSpot = getSpotById(statusId, spots)
  const home = path === '/'
  const join = path === '/join'
  const reception = path === '/reception'
  const barberName = path.match(/^\/barber\/([^/]+)$/)?.[1]
  const display = path === '/display'
  const admin = path === '/admin'
  const ownerText = ownerCopy[language]
  return (
    <div lang={language} className="min-h-screen bg-[#f4f1e9] text-[#1f2937]">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <button className="flex items-center gap-3 text-left" onClick={() => navigate('/')} aria-label={t.salon}>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1f2937] text-[#d4a017] shadow-lg shadow-slate-900/10"><Crown size={21} /></span>
          <span><span className="block font-serif text-lg font-semibold leading-tight tracking-wide">{t.salon}</span><span className="text-[10px] uppercase tracking-[.2em] text-slate-500">{t.descriptor}</span></span>
        </button>
        <div className="flex items-center gap-3">
      {!home && <button className="hidden items-center gap-1 text-sm font-semibold text-slate-600 sm:flex" onClick={() => navigate('/')}><ArrowLeft size={16} /> {t.back}</button>}
          <div className="flex rounded-full border border-slate-200 bg-white/80 p-1 text-xs font-bold shadow-sm" aria-label={t.language}>
            {['en', 'hi'].map((lang) => <button key={lang} onClick={() => setLanguage(lang)} className={`min-w-10 rounded-full px-2.5 py-1.5 uppercase transition ${language === lang ? 'bg-[#1f2937] text-white' : 'text-slate-500 hover:text-slate-900'}`}>{lang}</button>)}
          </div>
        </div>
      </header>

      {join && !settingsLoading && !queueOpen && <div role="status" className="mx-auto max-w-6xl px-5 pt-3 sm:px-8"><p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{ownerText.closedMessage}</p></div>}
      {join && !activeServices.length && <div role="status" className="mx-auto max-w-6xl px-5 pt-3 sm:px-8"><p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">{ownerText.noActiveServices}</p></div>}

      {admin ? <AdminScreen language={language} settings={settings} loading={settingsLoading} onLoadStats={loadTodayStats} syncError={queueSyncError ? t.syncError : ''} onSave={async (pin, nextSettings) => { const updated = await saveSettings(pin, nextSettings); setSettings(updated); return updated }} /> : display ? <DisplayScreen spots={spots} barberStates={effectiveBarberStates} language={language} /> : barberName ? <BarberScreen barberName={decodeURIComponent(barberName)} language={language} /> : reception ? <ReceptionScreen spots={spots} barberStates={barberStates} barberOnDuty={settings.barbers} language={language} t={t} error={walkInError ? t[walkInError] : ''}
        onCallNext={(barber, pin) => staffCallNext(pin, barber, spots, barberStates)}
        onNoShow={(id, pin) => staffUpdateSpot(pin, id, 'no_show')}
        onCancel={(id, pin) => staffUpdateSpot(pin, id, 'cancel')}
        onWalkIn={async (details) => { if (!details.name.trim() || !isValidPhone(details.phone) || !details.serviceIds.length) { setWalkInError(!details.name.trim() ? 'nameError' : !isValidPhone(details.phone) ? 'phoneError' : 'serviceError'); return } try { const joined = await joinSpot({ ...details, barber: 'any', source: 'walk_in' }); setSpots((current) => current.some((spot) => spot.id === joined.spot.id) ? current : [...current, joined.spot]); setWalkInError('') } catch { setWalkInError('queueError') } }} /> : home ? <main className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <section className="relative isolate mt-2 overflow-hidden rounded-[2rem] bg-[#1f2937] px-6 py-10 text-white shadow-2xl shadow-slate-900/15 sm:px-12 sm:py-16">
          <div className="absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border border-white/10" /><div className="absolute -right-4 -top-16 -z-10 h-56 w-56 rounded-full border border-[#d4a017]/30" />
          <div className="absolute bottom-0 right-8 hidden h-64 w-64 opacity-20 sm:block"><div className="absolute bottom-0 right-5 h-56 w-32 rounded-t-[5rem] border-2 border-[#d4a017]"/><div className="absolute bottom-0 right-20 h-44 w-24 rounded-t-[5rem] border-2 border-white/50"/></div>
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d4a017]/35 bg-[#d4a017]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#f1cd68]"><span className={`h-1.5 w-1.5 rounded-full ${queueOpen ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-rose-400'}`} />{queueOpen ? t.open : ownerText.queueClosed}</div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.25em] text-[#d4a017]">{t.homeEyebrow}</p>
            <h1 className="font-serif text-4xl font-medium leading-[1.08] tracking-tight sm:text-6xl">{t.heroLine1}<br/><span className="italic text-[#e6bc4a]">{t.heroLine2}</span></h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">{t.heroDescription}</p>
            <button disabled={!onlineQueueReady} onClick={() => navigate('/join')} className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#d4a017] px-7 text-sm font-bold text-[#1f2937] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#e2b32b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{t.join}<ArrowRight size={18}/></button>
            {!settingsLoading && !queueOpen && <p className="mt-3 text-sm text-amber-200">{ownerText.closedMessage}</p>}
          </div>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-[1.75rem] border border-white bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">{t.today}</p><h2 className="mt-2 font-serif text-2xl">{t.waitingHeadline}</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f8f2df] text-[#ad7f09]"><UsersRound size={20}/></span></div>
            {waitingSpots.length === 0 ? <p className="mt-7 rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">{t.walkIn}</p> : <div className="mt-6 flex items-end justify-between rounded-2xl bg-[#f7f5ef] px-5 py-4"><div><p className="font-serif text-4xl font-semibold">{waitingSpots.length}<span className="ml-2 text-base font-medium text-slate-500">{t.waiting}</span></p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{t.about}</p><p className="mt-1 flex items-center gap-1.5 text-lg font-semibold"><Clock3 size={16} className="text-[#b48710]"/>{homeWait} {t.minutes}</p></div></div>}
          </section>
          <section className="rounded-[1.75rem] border border-white bg-white p-6 shadow-sm sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">{t.barbers}</p>
            <div className="mt-4 grid grid-cols-3 gap-2.5">{barberData.map((barber) => <div key={barber.name} className="rounded-2xl bg-[#f7f5ef] p-3 text-center"><div className={`mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${barber.color} font-serif text-lg text-white ring-4 ring-white`}>{barber.initials}</div><p className="mt-2 text-sm font-bold">{barber.name}</p><span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${barberStates[barber.name] === 'free' ? 'text-emerald-700' : barberStates[barber.name] === 'busy' ? 'text-amber-700' : 'text-slate-500'}`}><i className={`h-1.5 w-1.5 rounded-full ${barberStates[barber.name] === 'free' ? 'bg-emerald-500' : barberStates[barber.name] === 'busy' ? 'bg-amber-500' : 'bg-slate-400'}`}/>{t[barberStates[barber.name]]}</span></div>)}</div>
          </section>
        </div>
        <p className="mt-6 text-center text-xs font-medium text-slate-500">✦ &nbsp; {t.celebration} &nbsp; ✦</p>
      </main> : join ? <main className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <div className="mb-6 mt-2 max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ad7f09]">{t.joinEyebrow}</p><h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{t.joinTitle}</h1><p className="mt-2 text-sm text-slate-500">{t.joinSubtitle}</p></div>
        {result ? <section role="status" className="mx-auto max-w-xl rounded-[2rem] border border-white bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-12"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f8f2df] text-[#ad7f09]"><Check size={29}/></span><h2 className="mt-5 font-serif text-3xl">{result.existing ? t.existing : t.joined}</h2><p className="mt-2 text-sm text-slate-500">{result.existing ? t.existingSpot : t.thanks}</p><div className="mx-auto mt-6 max-w-xs rounded-2xl bg-[#f7f5ef] p-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{result.existing ? t.existingPosition : t.newPosition.replace('{token}', result.token).replace('{position}', String(demoWaiting + 1))}</p><p className="mt-2 text-sm font-semibold">{totals.minutes} {t.minutes} · ₹{totals.price} · ~{expectedWait} {t.minutes}</p></div><button className="mt-6 text-sm font-bold text-slate-600 underline decoration-[#d4a017] underline-offset-4" onClick={() => navigate('/')}>{t.back}</button></section> : <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8f2df] text-xs font-extrabold text-[#ad7f09]">01</span><h2 className="font-serif text-xl">{t.yourDetails}</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">{t.name}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-[#fcfbf8] px-4 text-sm font-medium outline-none transition focus:border-[#d4a017] focus:ring-4 focus:ring-[#d4a017]/10"/></label><label className="block text-xs font-bold text-slate-600">{t.phone}<input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={t.phonePlaceholder} autoComplete="tel" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-[#fcfbf8] px-4 text-sm font-medium outline-none transition focus:border-[#d4a017] focus:ring-4 focus:ring-[#d4a017]/10"/><span className="mt-1.5 block text-[10px] font-medium text-slate-400">{t.phoneHint}</span></label></div></section>

            <section className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8f2df] text-xs font-extrabold text-[#ad7f09]">02</span><h2 className="font-serif text-xl">{t.services}</h2></div><span className="text-[10px] font-semibold text-slate-400">{selectedServices.length}/3 {t.selected}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{serviceData.map((service) => {const Icon = service.icon; const active = selectedServices.includes(service.id);return <button type="button" key={service.id} aria-pressed={active} onClick={() => toggleService(service.id)} className={`relative min-h-32 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${active ? 'border-[#d4a017] bg-[#fbf7e9] ring-2 ring-[#d4a017]/15' : 'border-slate-100 bg-[#fcfbf8] hover:border-slate-300'}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-[#d4a017] text-[#1f2937]' : 'bg-white text-slate-500'}`}><Icon size={17}/></span><span className="mt-3 block text-sm font-bold">{t[service.id]}</span><span className="mt-1 flex items-center justify-between text-[11px] text-slate-500"><span>{service.minutes} {t.minutes}</span><span className="font-bold text-[#1f2937]">₹{service.price}</span></span>{active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#d4a017] text-[#1f2937]"><Check size={12}/></span>}</button>})}</div></section>

            <section className="rounded-[1.75rem] border border-white bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f8f2df] text-xs font-extrabold text-[#ad7f09]">03</span><h2 className="font-serif text-xl">{t.barber}</h2></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><button type="button" onClick={() => setSelectedBarber('any')} className={`rounded-2xl border p-3 text-left transition ${selectedBarber === 'any' ? 'border-[#d4a017] bg-[#fbf7e9] ring-2 ring-[#d4a017]/15' : 'border-slate-100 bg-[#fcfbf8]'}`}><span className="grid h-11 w-11 place-items-center rounded-full bg-[#1f2937] text-[#d4a017]"><Sparkles size={17}/></span><span className="mt-2 block text-xs font-bold">{t.any}</span><span className="mt-0.5 block text-[10px] text-slate-500">{t.fastest}</span></button>{activeBarbers.map((barber) => <button type="button" key={barber.name} onClick={() => setSelectedBarber(barber.name)} className={`rounded-2xl border p-3 text-left transition ${selectedBarber === barber.name ? 'border-[#d4a017] bg-[#fbf7e9] ring-2 ring-[#d4a017]/15' : 'border-slate-100 bg-[#fcfbf8]'}`}><span className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${barber.color} font-serif text-lg text-white`}>{barber.initials}</span><span className="mt-2 block text-xs font-bold">{barber.name}</span><span className="mt-0.5 block text-[10px] text-slate-500">{t[barber.state]}</span></button>)}</div></section>
          </div>

          <aside className="sticky top-4 rounded-[1.75rem] bg-[#1f2937] p-5 text-white shadow-xl shadow-slate-900/15 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e6bc4a]">✦ &nbsp; {t.summary}</p><h2 className="mt-2 font-serif text-2xl">{t.personalized}</h2><div className="my-5 space-y-3 border-y border-white/10 py-4"><div className="flex justify-between text-sm"><span className="text-slate-300">{t.total}</span><strong>{totals.minutes} {t.minutes}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-300">{t.price}</span><strong>₹{totals.price}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-300">{t.expected}</span><strong>~{expectedWait} {t.minutes}</strong></div></div><p className="min-h-5 text-xs font-semibold text-rose-200" aria-live="polite">{error === 'onlineClosedError' ? ownerText.closedMessage : error ? t[error] : ' '}</p><button type="submit" disabled={!onlineQueueReady || !activeServices.length} className="mt-2 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#d4a017] px-4 py-3 text-sm font-bold text-[#1f2937] transition hover:bg-[#e2b32b]">{t.confirm}<ArrowRight size={17}/></button><p className="mt-3 text-center text-[10px] leading-4 text-slate-400">{t.spotHeld}</p></aside>
        </form>}
      </main> : <StatusScreen
        spot={statusSpot}
        spots={spots}
        barberStates={barberStates}
        language={language}
        setLanguage={setLanguage}
        t={t}
        onHome={() => navigate('/')}
        isLoading={!queueLoaded}
        syncError={queueSyncError ? t.syncError : ''}
        actionError={actionError ? t[actionError] : ''}
        onCancel={async () => {
          try {
            const cancelled = await cancelSpot(statusSpot?.id)
            if (cancelled) {
              setSpots((current) => current.filter((spot) => spot.id !== statusSpot?.id))
              setActionError('')
              navigate('/')
            } else {
              setActionError('cancelError')
            }
          } catch (cancelError) {
            console.error('Could not cancel the queue spot:', cancelError)
            setActionError('cancelError')
          }
        }}
      />}
      <footer className="mx-auto max-w-6xl px-5 pb-7 text-center text-[10px] font-medium uppercase tracking-[.2em] text-slate-400 sm:px-8">{t.salon} · {t.footerCity}</footer>
    </div>
  )
}

export default App
