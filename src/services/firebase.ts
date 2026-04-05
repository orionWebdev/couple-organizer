import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBdkkBd9l2SD7A9MuMpsAllw9ZU5rZgNOk",
  authDomain: "couple-organizer-8b245.firebaseapp.com",
  projectId: "couple-organizer-8b245",
  storageBucket: "couple-organizer-8b245.firebasestorage.app",
  messagingSenderId: "156866789081",
  appId: "1:156866789081:web:5762540f7bbd597ed488c8"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser')
  }
})
