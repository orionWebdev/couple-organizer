import { ref, readonly } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseAuthUser
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
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

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    authReady,
    login,
    register,
    logout,
    refreshUser
  }
}
