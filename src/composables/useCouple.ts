import { ref, onScopeDispose, readonly } from 'vue'
import {
  doc, collection, addDoc, updateDoc,
  query, where, getDocs, onSnapshot, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Couple } from '@/types'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of array) {
    code += chars[byte % chars.length]
  }
  return code
}

export function useCouple() {
  const { user, refreshUser } = useAuth()
  const couple = ref<Couple | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  // Listen to couple document in realtime
  function watchCouple(coupleId: string) {
    if (unsubscribe) unsubscribe()
    unsubscribe = onSnapshot(doc(db, 'couples', coupleId), (snap) => {
      if (snap.exists()) {
        couple.value = { id: snap.id, ...snap.data() } as Couple
      }
    })
  }

  // Start watching if user already has a coupleId
  if (user.value?.coupleId) {
    watchCouple(user.value.coupleId)
  }

  async function createCouple() {
    if (!user.value) return
    error.value = null
    loading.value = true
    try {
      const inviteCode = generateInviteCode()
      const coupleData = {
        memberIds: [user.value.uid],
        memberNames: { [user.value.uid]: user.value.displayName },
        inviteCode,
        createdAt: serverTimestamp()
      }

      const coupleRef = await addDoc(collection(db, 'couples'), coupleData)

      // Update user doc with coupleId
      await updateDoc(doc(db, 'users', user.value.uid), { coupleId: coupleRef.id })
      await refreshUser()
      watchCouple(coupleRef.id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function joinCouple(inviteCode: string) {
    if (!user.value) return
    error.value = null
    loading.value = true
    try {
      // Find couple by invite code
      const q = query(collection(db, 'couples'), where('inviteCode', '==', inviteCode.toUpperCase()))
      const snap = await getDocs(q)

      if (snap.empty) {
        error.value = 'Invalid invite code'
        return
      }

      const coupleDoc = snap.docs[0]
      const coupleData = coupleDoc.data()

      if (coupleData.memberIds.length >= 2) {
        error.value = 'This couple already has 2 members'
        return
      }

      if (coupleData.memberIds.includes(user.value.uid)) {
        error.value = 'You are already in this couple'
        return
      }

      // Add user to couple
      await updateDoc(doc(db, 'couples', coupleDoc.id), {
        memberIds: arrayUnion(user.value.uid),
        [`memberNames.${user.value.uid}`]: user.value.displayName
      })

      // Update user doc
      await updateDoc(doc(db, 'users', user.value.uid), { coupleId: coupleDoc.id })
      await refreshUser()
      watchCouple(coupleDoc.id)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    couple,
    loading: readonly(loading),
    error: readonly(error),
    createCouple,
    joinCouple,
    watchCouple
  }
}
