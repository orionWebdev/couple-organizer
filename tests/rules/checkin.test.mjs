// Rules-Tests fürs Check-in — die erste Testdatei des Repos, und zwar genau
// hier, weil ein Rules-Fehler in diesem Feature kein Bug wäre, sondern ein
// Privacy-Bruch: der Partner dürfte private Einträge lesen.
//
// Lauf (startet den Firestore-Emulator selbst):
//   npx firebase-tools emulators:exec --only firestore --project couple-organizer-8b245 \
//     "node tests/rules/checkin.test.mjs"
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where
} from 'firebase/firestore'

const COUPLE = 'c1'
const ALICE = 'alice'
const BOB = 'bob'
const OUTSIDER = 'carol'

let passed = 0
let failed = 0

async function check(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.error(`  ✗ ${name}\n    ${err.message}`)
  }
}

const env = await initializeTestEnvironment({
  projectId: 'couple-organizer-8b245',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') }
})

// Ausgangslage: ein Paar (alice + bob), carol ist Außenstehende.
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'couples', COUPLE), {
    memberIds: [ALICE, BOB],
    memberNames: { [ALICE]: 'Alice', [BOB]: 'Bob' },
    inviteCode: 'TEST01'
  })
  await setDoc(doc(ctx.firestore(), 'checkinEntries', 'e-alice'), {
    coupleId: COUPLE,
    authorId: ALICE,
    area: 'haushalt',
    level: 2,
    text: 'nur für alice',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 56 * 86400000)
  })
  await setDoc(doc(ctx.firestore(), 'checkinDigests', `${COUPLE}_${ALICE}`), {
    coupleId: COUPLE,
    authorId: ALICE,
    areas: { haushalt: { count: 1, maxLevel: 2 } },
    lastEntryAt: new Date(),
    updatedAt: new Date()
  })
})

const alice = env.authenticatedContext(ALICE).firestore()
const bob = env.authenticatedContext(BOB).firestore()
const outsider = env.authenticatedContext(OUTSIDER).firestore()

console.log('\ncheckinEntries — privat, nur der Autor:')

await check('Autorin liest ihren eigenen Eintrag', () =>
  assertSucceeds(getDoc(doc(alice, 'checkinEntries', 'e-alice'))))

await check('Partner kann den Eintrag NICHT lesen', () =>
  assertFails(getDoc(doc(bob, 'checkinEntries', 'e-alice'))))

await check('Partner kann NICHT über die Autorin queryn', () =>
  assertFails(getDocs(query(
    collection(bob, 'checkinEntries'),
    where('coupleId', '==', COUPLE), where('authorId', '==', ALICE)
  ))))

await check('Partner kann seine EIGENEN Einträge queryn', () =>
  assertSucceeds(getDocs(query(
    collection(bob, 'checkinEntries'),
    where('coupleId', '==', COUPLE), where('authorId', '==', BOB)
  ))))

await check('Partner kann den Eintrag NICHT löschen', () =>
  assertFails(deleteDoc(doc(bob, 'checkinEntries', 'e-alice'))))

await check('Autorin kann ihren Eintrag NICHT ändern (Momentaufnahme)', () =>
  assertFails(updateDoc(doc(alice, 'checkinEntries', 'e-alice'), { level: 3 })))

await check('Eintrag mit fremder authorId wird abgelehnt (Spoofing)', () =>
  assertFails(addDoc(collection(alice, 'checkinEntries'), {
    coupleId: COUPLE, authorId: BOB, area: 'zeit', level: 1, text: null,
    createdAt: new Date(), expiresAt: new Date()
  })))

await check('Außenstehende kann keinen Eintrag im fremden Paar anlegen', () =>
  assertFails(addDoc(collection(outsider, 'checkinEntries'), {
    coupleId: COUPLE, authorId: OUTSIDER, area: 'zeit', level: 1, text: null,
    createdAt: new Date(), expiresAt: new Date()
  })))

await check('Autorin kann ihren Eintrag löschen', () =>
  assertSucceeds(deleteDoc(doc(alice, 'checkinEntries', 'e-alice'))))

console.log('\ncheckinDigests — paar-lesbar, nur der Autor schreibt:')

await check('Partner liest den Digest der Autorin', () =>
  assertSucceeds(getDoc(doc(bob, 'checkinDigests', `${COUPLE}_${ALICE}`))))

await check('Außenstehende liest den Digest NICHT', () =>
  assertFails(getDoc(doc(outsider, 'checkinDigests', `${COUPLE}_${ALICE}`))))

await check('Partner kann fremdes Digest-Doc NICHT überschreiben (Id-Vertrag)', () =>
  assertFails(setDoc(doc(bob, 'checkinDigests', `${COUPLE}_${ALICE}`), {
    coupleId: COUPLE, authorId: BOB, areas: {}, lastEntryAt: null, updatedAt: new Date()
  })))

await check('Autor schreibt sein eigenes Digest-Doc', () =>
  assertSucceeds(setDoc(doc(bob, 'checkinDigests', `${COUPLE}_${BOB}`), {
    coupleId: COUPLE, authorId: BOB, areas: { zeit: { count: 1, maxLevel: 1 } },
    lastEntryAt: new Date(), updatedAt: new Date()
  })))

await check('Digest unter falscher Doc-Id wird abgelehnt', () =>
  assertFails(setDoc(doc(bob, 'checkinDigests', 'beliebige-id'), {
    coupleId: COUPLE, authorId: BOB, areas: {}, lastEntryAt: null, updatedAt: new Date()
  })))

await env.cleanup()

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`)
process.exit(failed ? 1 : 0)
