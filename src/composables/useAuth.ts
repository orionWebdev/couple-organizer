import { ref, readonly } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
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

// Listen for auth state changes and load user profile from Firestore
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (userDoc.exists()) {
      user.value = userDoc.data() as User
    } else {
      // User doc not yet created (shouldn't happen after register, but handle gracefully)
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || 'User',
        coupleId: null,
        createdAt: null as any
      }
    }
  } else {
    user.value = null
  }
  loading.value = false
  resolveAuthReady()
})

export function useAuth() {
  async function login(email: string, password: string) {
    error.value = null
    try {
      await signInWithEmailAndPassword(auth, email, password)
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
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        coupleId: null,
        createdAt: serverTimestamp() as any
      }
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
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
    if (userDoc.exists()) {
      user.value = userDoc.data() as User
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
    refreshUser
  }
}
