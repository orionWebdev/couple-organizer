// Check-in — „Wie geht's dir gerade?"
//
// Der Listener läuft AUSSCHLIESSLICH auf den eigenen Einträgen (authorId ==
// eigene uid); die des Partners sind über die Rules gar nicht lesbar. Was das
// Paar gemeinsam „sieht", ist nur der grobe Enum-Digest (checkinDigests), und
// auch der wird in keiner UI angezeigt — er existiert allein für den
// Coach-Snapshot.
//
// Schreiben ist bewusst OHNE Paywall-Gate: der Eintrag selbst kostet keine KI.
// Die Quota greift erst, wenn der Coach-Bericht erzeugt wird (coachAi-Bucket).
import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, getDoc, setDoc, writeBatch,
  serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import { useCouple } from './useCouple'
import type { CheckinArea, CheckinDigest, CheckinEntry, CheckinLevel } from '@/types'

// Datenminimierung: kein Archiv. Serverseitig räumt die Firestore-TTL-Policy
// auf `expiresAt` auf (bis zu 72 h Verzug), der Client filtert zusätzlich.
export const CHECKIN_RETENTION_DAYS = 56
const MAX_TEXT_LENGTH = 500

export interface AddCheckinInput {
  area: CheckinArea
  level: CheckinLevel
  text?: string
}

function digestId(coupleId: string, uid: string): string {
  return `${coupleId}_${uid}`
}

export function useCheckin(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const { couple } = useCouple()

  const entries = ref<CheckinEntry[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  const uid = computed(() => user.value?.uid ?? null)

  // Einwilligungen kommen vom Couple-Doc (useCouple ist Modul-Singleton).
  const optedIn = computed(() => !!(uid.value && couple.value?.checkinOptIn?.[uid.value]))
  const partnerOptedIn = computed(() => {
    const partner = couple.value?.memberIds.find((id) => id !== uid.value)
    return !!(partner && couple.value?.checkinOptIn?.[partner])
  })

  function startListening(id: string, me: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(
      collection(db, 'checkinEntries'),
      where('coupleId', '==', id),
      where('authorId', '==', me),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const cutoff = Date.now() - CHECKIN_RETENTION_DAYS * 86400000
        entries.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as CheckinEntry))
          .filter((e) => {
            const ms = e.createdAt?.toMillis?.() ?? 0
            // Frisch geschriebene Docs haben serverTimestamp noch als null —
            // die gehören selbstverständlich dazu.
            return ms === 0 || ms >= cutoff
          })
        loading.value = false
      },
      (err) => {
        console.error('Checkin listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch([coupleId, uid], ([id, me]) => {
    if (!id || !me) {
      if (unsubscribe) { unsubscribe(); unsubscribe = null }
      entries.value = []
      loading.value = false
      return
    }
    startListening(id, me)
  }, { immediate: true })

  // Digest deterministisch aus dem übergebenen Stand neu bauen (kein
  // increment()-Drift; nach Löschungen stimmt er so automatisch wieder).
  async function writeDigest(entriesNow: readonly CheckinEntry[]): Promise<void> {
    if (!coupleId.value || !uid.value) return
    const areas: CheckinDigest['areas'] = {}
    let lastMs = 0
    for (const e of entriesNow) {
      const prev = areas[e.area]
      areas[e.area] = {
        count: (prev?.count ?? 0) + 1,
        maxLevel: prev && prev.maxLevel >= e.level ? prev.maxLevel : e.level
      }
      lastMs = Math.max(lastMs, e.createdAt?.toMillis?.() ?? Date.now())
    }
    await setDoc(doc(db, 'checkinDigests', digestId(coupleId.value, uid.value)), {
      coupleId: coupleId.value,
      authorId: uid.value,
      areas,
      lastEntryAt: lastMs ? Timestamp.fromMillis(lastMs) : null,
      updatedAt: serverTimestamp()
    })
  }

  async function addEntry(input: AddCheckinInput): Promise<boolean> {
    if (!coupleId.value || !uid.value) return false
    const text = input.text?.trim().slice(0, MAX_TEXT_LENGTH) || null
    try {
      const now = Date.now()
      const ref = await addDoc(collection(db, 'checkinEntries'), {
        coupleId: coupleId.value,
        authorId: uid.value,
        area: input.area,
        level: input.level,
        text,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + CHECKIN_RETENTION_DAYS * 86400000)
      })
      // Der Listener hat den neuen Eintrag evtl. noch nicht — lokal ergänzen.
      const local: CheckinEntry = {
        id: ref.id,
        coupleId: coupleId.value,
        authorId: uid.value,
        area: input.area,
        level: input.level,
        text,
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + CHECKIN_RETENTION_DAYS * 86400000)
      }
      await writeDigest([local, ...entries.value.filter((e) => e.id !== ref.id)])
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add checkin entry:', err)
      error.value = err.message
      return false
    }
  }

  async function removeEntry(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'checkinEntries', id))
      await writeDigest(entries.value.filter((e) => e.id !== id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to remove checkin entry:', err)
      error.value = err.message
      return false
    }
  }

  // Löscht alle EIGENEN Einträge samt Digest (Opt-out, Settings, Kontolöschung).
  async function deleteAllMine(): Promise<boolean> {
    if (!coupleId.value || !uid.value) return false
    try {
      const batch = writeBatch(db)
      for (const e of entries.value) batch.delete(doc(db, 'checkinEntries', e.id))
      batch.delete(doc(db, 'checkinDigests', digestId(coupleId.value, uid.value)))
      await batch.commit()
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete checkin entries:', err)
      error.value = err.message
      return false
    }
  }

  // Für den Coach-Snapshot: die Digests BEIDER Partner einmalig lesen (kein
  // Dauer-Listener — gebraucht wird das nur im Moment des Berichts).
  async function readCoupleDigests(): Promise<(CheckinDigest | null)[]> {
    if (!coupleId.value || !couple.value) return []
    const id = coupleId.value
    const reads = couple.value.memberIds.map(async (member) => {
      try {
        const snap = await getDoc(doc(db, 'checkinDigests', digestId(id, member)))
        return snap.exists() ? (snap.data() as CheckinDigest) : null
      } catch {
        return null
      }
    })
    return Promise.all(reads)
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    entries: readonly(entries),
    loading: readonly(loading),
    error: readonly(error),
    optedIn,
    partnerOptedIn,
    addEntry,
    removeEntry,
    deleteAllMine,
    readCoupleDigests
  }
}
