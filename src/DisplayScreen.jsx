import { useEffect, useRef, useState } from 'react'
import { BARBERS, getEstimatedWaitMinutes, getWaitingSpots } from './queueRules.js'
import { staffCopy } from './staffCopy.js'

function playChime(context) {
  try {
    if (!context) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.setValueAtTime(1174, context.currentTime + 0.12)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.56)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  } catch { /* Audio can be disabled by the browser or device. */ }
}

export default function DisplayScreen({ spots, barberStates, language }) {
  const t = staffCopy[language]
  const [flashToken, setFlashToken] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const previous = useRef(new Map())
  const audioContext = useRef(null)
  useEffect(() => {
    const calls = new Map(spots.filter((spot) => ['called', 'in_chair'].includes(spot.status)).map((spot) => [spot.id, spot.status]))
    const newCall = spots.find((spot) => spot.status === 'called' && previous.current.get(spot.id) !== 'called')
    if (newCall) {
      setFlashToken(newCall.token)
      if (soundEnabled) playChime(audioContext.current)
    }
    previous.current = calls
  }, [spots, soundEnabled])
  useEffect(() => {
    if (!flashToken) return undefined
    const timer = window.setTimeout(() => setFlashToken(null), 5000)
    return () => window.clearTimeout(timer)
  }, [flashToken])
  const enableSound = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    audioContext.current = new AudioContextClass()
    await audioContext.current.resume()
    setSoundEnabled(true)
  }
  const waiting = getWaitingSpots(spots).slice(0, 5)
  const liveSpots = spots.filter((spot) => ['called', 'in_chair'].includes(spot.status))
  return <main className="min-h-[calc(100vh-100px)] bg-[#111827] px-5 py-7 text-white sm:px-10 lg:px-16">
    <div className="mx-auto max-w-[1800px]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h1 className="font-serif text-4xl font-bold sm:text-6xl">{t.tvTitle}</h1><button onClick={enableSound} disabled={soundEnabled} className="min-h-12 rounded-xl border border-[#d4a017]/60 px-5 text-sm font-bold text-[#f4d982] disabled:opacity-60">{soundEnabled ? t.soundOn : t.enableSound}</button></div>
      <section className="grid grid-cols-1 gap-3">{BARBERS.map((barber) => {
        const current = liveSpots.find((spot) => spot.calledBy === barber.name)
        return <article key={barber.name} className={`flex items-center justify-between gap-4 rounded-3xl border border-white/10 px-5 py-4 sm:px-8 sm:py-5 ${current?.token === flashToken ? 'animate-pulse bg-[#d4a017] text-[#1f2937]' : 'bg-white/5'}`}>
          <div className="flex min-w-0 items-center gap-4"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br ${barber.color} font-serif text-2xl text-white sm:h-20 sm:w-20 sm:text-4xl`}>{barber.initials}</span><div><h2 className="font-serif text-2xl font-bold sm:text-4xl">{barber.name}</h2>{barberStates[barber.name] === 'break' && <p className="mt-1 text-sm font-bold sm:text-lg">{t.onBreak}</p>}</div></div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-8"><p className={`text-sm font-bold uppercase tracking-wider sm:text-2xl ${current?.token === flashToken ? 'text-[#332500]' : 'text-slate-300'}`}>{t.now}:</p><p aria-live="polite" className="font-serif text-4xl font-extrabold sm:text-6xl lg:text-7xl">{current?.token ?? '—'}</p></div>
        </article>
      })}</section>
      <section className="mt-8 rounded-3xl bg-white p-5 text-[#1f2937] sm:p-8"><div className="mb-5 flex items-end justify-between"><h2 className="font-serif text-3xl font-bold sm:text-5xl">{t.upNext}</h2><span className="text-sm font-bold text-slate-500 sm:text-xl">{waiting.length}/5</span></div>
        {waiting.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{waiting.map((spot) => <article key={spot.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f4f1e9] p-4 sm:block sm:p-5"><p className="font-serif text-3xl font-extrabold sm:text-4xl">{spot.token}</p><p className="text-base font-bold text-slate-500 sm:mt-3 sm:text-lg">{t.estimated} {getEstimatedWaitMinutes(spot.id, spots, barberStates)} {t.minutes}</p></article>)}</div> : <p className="rounded-2xl bg-[#f4f1e9] px-5 py-8 text-center text-2xl font-bold text-slate-500 sm:text-3xl">{t.queueEmpty}</p>}
      </section>
    </div>
  </main>
}
