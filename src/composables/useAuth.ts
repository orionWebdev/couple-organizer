import { ref, readonly } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  type User as FirebaseAuthUser
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp,
  arrayRemove, deleteField
} from 'firebase/firestore'
import { auth, db } from '@/services/firebase'
import type { User } from '@/types'

// Shared singleton state across all components
const user = ref<User | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Resolves when the initial auth check completes
let authReady: Promise<void>
let resolveAuthReady: () => void

authReady = new Promise((resolve) => {
  resolveAuthReady = resolve
})

function createFallbackUser(firebaseUser: FirebaseAuthUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'User',
    coupleId: null,
    createdAt: null as any
  }
}

function createUserProfilePayload(firebaseUser: FirebaseAuthUser) {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'User',
    coupleId: null,
    createdAt: serverTimestamp()
  }
}

function getFirebaseErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code)
  }
  return undefined
}

function isOfflineFirestoreError(error: unknown): boolean {
  const code = getFirebaseErrorCode(error)
  if (code === 'unavailable') return true

  if (error instanceof Error) {
    return error.message.toLowerCase().includes('offline')
  }

  return false
}

async function loadUserProfile(firebaseUser: FirebaseAuthUser): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))

    if (userDoc.exists()) {
      user.value = userDoc.data() as User
      return
    }

    const fallbackUser = createFallbackUser(firebaseUser)
    user.value = fallbackUser

    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), createUserProfilePayload(firebaseUser))
    } catch (profileError) {
      if (isOfflineFirestoreError(profileError)) {
        console.warn('Firestore ist offline. Benutzerprofil wird spaeter erstellt.', profileError)
        return
      }

      console.error('Fehlendes Benutzerprofil konnte nicht automatisch erstellt werden.', profileError)
    }
  } catch (error) {
    if (isOfflineFirestoreError(error)) {
      console.warn('Firestore ist derzeit offline. Verwende temporaeres Benutzerprofil.', error)
      user.value = createFallbackUser(firebaseUser)
      return
    }

    console.error('Benutzerprofil konnte nicht aus Firestore geladen werden.', error)
    user.value = createFallbackUser(firebaseUser)
  }
}

// Listen for auth state changes and load user profile from Firestore
onAuthStateChanged(auth, async (firebaseUser) => {
  try {
    if (firebaseUser) {
      await loadUserProfile(firebaseUser)
    } else {
      user.value = null
    }
  } finally {
    loading.value = false
    resolveAuthReady()
  }
})

export function useAuth() {
  async function login(email: string, password: string) {
    error.value = null
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
      await loadUserProfile(firebaseUser)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function register(email: string, password: string, displayName: string) {
    error.value = null
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(firebaseUser, { displayName })

      // Create user document in Firestore
      const userData: User = createUserProfilePayload({
        ...firebaseUser,
        displayName
      } as FirebaseAuthUser) as User
      await setDoc(doc(db, 'users', firebaseUser.uid), userData)
      user.value = userData
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  // Reload user data from Firestore (e.g., after coupleId changes)
  async function refreshUser() {
    if (!auth.currentUser) return
    await loadUserProfile(auth.currentUser)
  }

  // Nie an den Aufrufer werfen — analog zu den anderen use*.ts-Composables.
  async function updatePrefs(patch: Partial<Pick<User, 'notifyPush' | 'languageEnglish'>>): Promise<boolean> {
    if (!user.value) return false
    try {
      await updateDoc(doc(db, 'users', user.value.uid), patch)
      user.value = { ...user.value, ...patch }
      error.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // Entfernt den Account vollständig: Mitgliedschaft in der Couple (falls
  // vorhanden), das Firestore-Profil, dann den Firebase-Auth-User selbst.
  // Löscht NICHT die geteilten Couple-Daten (Chores/Ausgaben/...) — die
  // gehören weiterhin dem verbleibenden Partner.
  async function deleteAccount(): Promise<{ ok: boolean; message?: string }> {
    const firebaseUser = auth.currentUser
    if (!firebaseUser || !user.value) return { ok: false, message: 'Nicht angemeldet' }

    try {
      const coupleId = user.value.coupleId
      if (coupleId) {
        await updateDoc(doc(db, 'couples', coupleId), {
          memberIds: arrayRemove(firebaseUser.uid),
          [`memberNames.${firebaseUser.uid}`]: deleteField(),
          [`memberIcons.${firebaseUser.uid}`]: deleteField()
        })
      }

      await deleteDoc(doc(db, 'users', firebaseUser.uid))
      await deleteUser(firebaseUser)
      user.value = null
      return { ok: true }
    } catch (e: any) {
      if (getFirebaseErrorCode(e) === 'auth/requires-recent-login') {
        return { ok: false, message: 'Bitte einmal aus- und wieder einloggen und dann erneut versuchen.' }
      }
      error.value = e.message
      return { ok: false, message: e.message }
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    authReady,
    login,
    register,
    logout,
    refreshUser,
    updatePrefs,
    deleteAccount
  }
}
