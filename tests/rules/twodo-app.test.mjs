// Rules-Tests für die Collections der Flutter-App (2026-10): fixedCosts,
// moments, giftIdeas. giftIdeas ist der heikle Teil — eine Lücke hier hieße,
// der Partner sieht seine Geschenke vorher.
//
// Lauf (startet den Firestore-Emulator selbst):
//   npx firebase-tools emulators:exec --only firestore --project couple-organizer-8b245 \
//     "node tests/rules/twodo-app.test.mjs"
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore'

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

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'couples', COUPLE), { memberIds: [ALICE, BOB], memberNames: { [ALICE]: 'Alice', [BOB]: 'Bob' }, inviteCode: 'TEST01' })
  await setDoc(doc(db, 'giftIdeas', 'g-alice'), { coupleId: COUPLE, authorId: ALICE, title: 'Konzertkarten', given: false })
  await setDoc(doc(db, 'moments', 'm1'), { coupleId: COUPLE, type: 'trip', title: 'Usedom', date: '2023-07', createdBy: ALICE })
  await setDoc(doc(db, 'fixedCosts', 'f1'), { coupleId: COUPLE, title: 'Miete', amount: 90000, createdBy: ALICE })
})

const alice = env.authenticatedContext(ALICE).firestore()
const bob = env.authenticatedContext(BOB).firestore()
const outsider = env.authenticatedContext(OUTSIDER).firestore()

console.log('\ngiftIdeas — nur für die Autorin:')
await check('Autorin liest ihre Idee', () => assertSucceeds(getDoc(doc(alice, 'giftIdeas', 'g-alice'))))
await check('Autorin fragt ihre Ideen ab', () =>
  assertSucceeds(getDocs(query(collection(alice, 'giftIdeas'), where('coupleId', '==', COUPLE), where('authorId', '==', ALICE)))))
await check('Partner kann die Idee NICHT lesen', () => assertFails(getDoc(doc(bob, 'giftIdeas', 'g-alice'))))
await check('Partner kann NICHT nach der Autorin abfragen', () =>
  assertFails(getDocs(query(collection(bob, 'giftIdeas'), where('coupleId', '==', COUPLE), where('authorId', '==', ALICE)))))
await check('Partner kann NICHT alle des Paars abfragen (auch keinen Zähler)', () =>
  assertFails(getDocs(query(collection(bob, 'giftIdeas'), where('coupleId', '==', COUPLE)))))
await check('Partner kann sie NICHT ändern oder löschen', async () => {
  await assertFails(updateDoc(doc(bob, 'giftIdeas', 'g-alice'), { given: true }))
  await assertFails(deleteDoc(doc(bob, 'giftIdeas', 'g-alice')))
})
await check('Niemand legt eine Idee im Namen eines anderen an', () =>
  assertFails(setDoc(doc(bob, 'giftIdeas', 'g-fake'), { coupleId: COUPLE, authorId: ALICE, title: 'x' })))
await check('Außenstehende legen keine Idee in fremdem Paar an', () =>
  assertFails(setDoc(doc(outsider, 'giftIdeas', 'g-out'), { coupleId: COUPLE, authorId: OUTSIDER, title: 'x' })))
await check('Autorin kann den Autor nicht umschreiben', () =>
  assertFails(updateDoc(doc(alice, 'giftIdeas', 'g-alice'), { authorId: BOB })))
await check('Autorin hakt ab und löscht', async () => {
  await assertSucceeds(updateDoc(doc(alice, 'giftIdeas', 'g-alice'), { given: true }))
  await assertSucceeds(deleteDoc(doc(alice, 'giftIdeas', 'g-alice')))
})

console.log('\nmoments / fixedCosts — das Paar, sonst niemand:')
for (const col of ['moments', 'fixedCosts']) {
  const id = col === 'moments' ? 'm1' : 'f1'
  await check(`${col}: Partner liest`, () => assertSucceeds(getDoc(doc(bob, col, id))))
  await check(`${col}: Partner ändert`, () => assertSucceeds(updateDoc(doc(bob, col, id), { title: 'neu' })))
  await check(`${col}: Außenstehende lesen NICHT`, () => assertFails(getDoc(doc(outsider, col, id))))
  await check(`${col}: Anlegen nur im eigenen Namen`, async () => {
    await assertSucceeds(setDoc(doc(bob, col, `${id}-b`), { coupleId: COUPLE, title: 'x', createdBy: BOB }))
    await assertFails(setDoc(doc(bob, col, `${id}-c`), { coupleId: COUPLE, title: 'x', createdBy: ALICE }))
  })
}

await env.cleanup()
console.log(`\n${passed} ok, ${failed} fehlgeschlagen`)
process.exit(failed === 0 ? 0 : 1)
