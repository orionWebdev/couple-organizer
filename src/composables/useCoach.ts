import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import { coachInsight, type CoachLens, type CoachReport } from '@/services/ai'
import { isoWeek, mondayOf } from '@/utils/belegung'

// Der Wochenbericht des Paar-Coachs.
//
// Entscheidend: ein Bericht gehört dem PAAR, nicht der Person. Wer ihn auslöst,
// erzeugt ihn für beide — zwei unterschiedliche KI-Texte über die Fairness
// desselben Haushalts wären Gift. Deshalb liegt er in Firestore und nicht im
// lokalen State, und deshalb gibt es genau einen pro Woche.
export interface CoachReportDoc {
  id: string
  coupleId: string
  weekKey: string // "2026-W30" — ISO-Jahr + Kalenderwoche
  lens: CoachLens
  report: CoachReport
  createdBy: string
  createdAt: unknown
}

const RECENT_LIMIT = 8

// ISO-Wochenschlüssel. Das Jahr kommt vom Donnerstag der Woche, sonst landet
// der 31.12. in Woche 1 des Vorjahres.
export function weekKeyOf(date = new Date()): string {
  const monday = mondayOf(date)
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)
  return `${thursday.getFullYear()}-W${String(isoWeek(date)).padStart(2, '0')}`
}

export function useCoach(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const reports = ref<CoachReportDoc[]>([])
  const loading = ref(true)
  const generating = ref(false)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    // Nur die letzten paar Wochen — alles Ältere interessiert niemanden mehr,
    // und der Bericht der laufenden Woche steht damit garantiert vorne.
    const q = query(
      collection(db, 'coachReports'),
      where('coupleId', '==', id),
      orderBy('weekKey', 'desc'),
      limit(RECENT_LIMIT)
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        reports.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoachReportDoc))
        loading.value = false
      },
      (err) => {
        console.error('Coach reports listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      reports.value = []
      loading.value = false
      if (unsubscribe) { unsubscribe(); unsubscribe = null }
      return
    }
    startListening(id)
  }, { immediate: true })

  const currentWeekKey = computed(() => weekKeyOf())

  // Der Bericht der laufenden Woche — das, was die Dashboard-Karte zeigt.
  const currentReport = computed<CoachReportDoc | null>(
    () => reports.value.find((r) => r.weekKey === currentWeekKey.value && r.lens === 'week') ?? null
  )

  const hasCurrentReport = computed(() => !!currentReport.value)

  // Erzeugt das Check-in für die laufende Woche und legt es für BEIDE ab.
  // Nie werfen (Haus-Konvention); Quota/Premium kommen als AiResult-Zweig zurück
  // und werden hier als 'paywall' signalisiert, damit der View sie öffnen kann.
  async function generateWeekReport(
    snapshot: unknown
  ): Promise<
    { kind: 'ok'; report: CoachReport } | { kind: 'paywall' } | { kind: 'error'; message: string }
  > {
    if (!coupleId.value || !user.value || generating.value) {
      return { kind: 'error', message: 'Check-in konnte nicht gestartet werden.' }
    }
    generating.value = true
    try {
      const result = await coachInsight(coupleId.value, 'week', snapshot)
      // Ein KI-Ausfall ist keine Paywall — der Unterschied entscheidet, ob der
      // Nutzer ein Kaufangebot oder ein "gleich nochmal" zu sehen bekommt.
      if (result.kind === 'error') return { kind: 'error', message: result.message }
      if (result.kind !== 'ok') return { kind: 'paywall' }

      await addDoc(collection(db, 'coachReports'), {
        coupleId: coupleId.value,
        weekKey: currentWeekKey.value,
        lens: 'week' as CoachLens,
        report: result.data,
        createdBy: user.value.uid,
        createdAt: serverTimestamp()
      })
      error.value = null
      return { kind: 'ok', report: result.data }
    } catch (err: any) {
      // Bis hierhin kommt nur noch ein fehlgeschlagener Firestore-Schreibzugriff
      // (Rules/Index) — die KI-Fehler sind oben schon abgefangen.
      console.error('Failed to save coach report:', err)
      error.value = err.message
      return { kind: 'error', message: 'Das Check-in konnte nicht gespeichert werden.' }
    } finally {
      generating.value = false
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    reports: readonly(reports),
    loading,
    generating: readonly(generating),
    error: readonly(error),
    currentWeekKey,
    currentReport,
    hasCurrentReport,
    generateWeekReport
  }
}
