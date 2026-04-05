import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBdkkBd9l2SD7A9MuMpsAllw9ZU5rZgNOk",
  authDomain: "couple-organizer-8b245.firebaseapp.com",
  projectId: "couple-organizer-8b245",
  storageBucket: "couple-organizer-8b245.firebasestorage.app",
  messagingSenderId: "156866789081",
  appId: "1:156866789081:web:5762540f7bbd597ed488c8"
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Use initializeFirestore with persistent cache (replaces deprecated enableIndexedDbPersistence).
// Falls back to getFirestore if already initialized (e.g. HMR).
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
  } catch {
    return getFirestore(app)
  }
})()
