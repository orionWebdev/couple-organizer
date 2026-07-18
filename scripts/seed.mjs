// Testdaten-Seed für die Emulator-Sandbox.
//
// Legt ein Premium-Paar (zwei Mitglieder) an und füllt ALLE App-Bereiche mit
// realistischen deutschen Testdaten — inkl. gelikter Rezepte und kürzlich
// gekochter Tage, damit der Wochen-Autopilot seine Favoriten-/Vermeiden-Logik
// zeigt. Premium wird direkt aufs Couple-Doc geschrieben (Admin-SDK umgeht die
// firestore.rules).
//
// Voraussetzung: Emulatoren laufen (`npm run emulators`). Dann `npm run seed`.
// Das Skript spricht ausschließlich den Emulator an (Env-Hosts unten) und fasst
// NIE das Live-Projekt an.
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Emulator-Hosts erzwingen, BEVOR das Admin-SDK initialisiert. Ohne diese
// beiden Variablen würde das SDK gegen die echte Cloud gehen.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'

const PROJECT_ID = 'couple-organizer-8b245' // muss zu src/services/firebase.ts passen
const PASSWORD = 'test1234'

const CHRIS = { uid: 'test-chris', email: 'chris@test.de', name: 'Chris', icon: '🦊' }
const SARAH = { uid: 'test-sarah', email: 'sarah@test.de', name: 'Sarah', icon: '🐧' }
const COUPLE_ID = 'test-couple'

initializeApp({ projectId: PROJECT_ID })
const db = getFirestore()
const auth = getAuth()

// ── Zeit-Helfer ──────────────────────────────────────────────────
const DAY = 86400000
const now = new Date()
const at = (daysAgo, hour = 12) => {
  const d = new Date(now.getTime() - daysAgo * DAY)
  d.setHours(hour, 0, 0, 0)
  return Timestamp.fromDate(d)
}
const dateKey = (daysFromNow) => {
  const d = new Date(now.getTime() + daysFromNow * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const monthKey = (monthsAgo = 0) => {
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
// Montag dieser Woche als Offset zu heute (für Wochenplan-Tage).
const mondayOffset = (() => {
  const day = now.getDay() // 0=So
  return day === 0 ? -6 : 1 - day
})()

async function ensureUser({ uid, email, name }) {
  try {
    await auth.createUser({ uid, email, password: PASSWORD, displayName: name, emailVerified: true })
  } catch (e) {
    if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
      await auth.updateUser(uid, { email, password: PASSWORD, displayName: name })
    } else throw e
  }
}

// Alle bestehenden Testdaten dieses Paares wegräumen, damit ein erneuter Lauf
// keine Duplikate erzeugt.
const COLLECTIONS = [
  'chores', 'choreHistory', 'favoriteChores', 'shoppingItems', 'shoppingLists',
  'expenses', 'financeEvents', 'recipes', 'mealPlans', 'bucketListItems',
  'bookings', 'resources', 'trips', 'notes'
]
async function clearCouple() {
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).where('coupleId', '==', COUPLE_ID).get()
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    if (snap.size) await batch.commit()
  }
}

// Schreibt Dokumente mit stabilen IDs (idempotent) in eine Collection.
async function seedDocs(name, docs) {
  const batch = db.batch()
  for (const { id, ...data } of docs) {
    const ref = id ? db.collection(name).doc(id) : db.collection(name).doc()
    batch.set(ref, { coupleId: COUPLE_ID, ...data })
  }
  await batch.commit()
  return docs.length
}

async function main() {
  console.log(`\n🌱 Seed → Emulator (Firestore ${process.env.FIRESTORE_EMULATOR_HOST}, Auth ${process.env.FIREBASE_AUTH_EMULATOR_HOST})`)

  await ensureUser(CHRIS)
  await ensureUser(SARAH)

  await db.collection('users').doc(CHRIS.uid).set({
    uid: CHRIS.uid, email: CHRIS.email, displayName: CHRIS.name, coupleId: COUPLE_ID, createdAt: at(90)
  })
  await db.collection('users').doc(SARAH.uid).set({
    uid: SARAH.uid, email: SARAH.email, displayName: SARAH.name, coupleId: COUPLE_ID, createdAt: at(90)
  })

  await clearCouple()

  // ── Couple + Premium ───────────────────────────────────────────
  await db.collection('couples').doc(COUPLE_ID).set({
    memberIds: [CHRIS.uid, SARAH.uid],
    memberNames: { [CHRIS.uid]: CHRIS.name, [SARAH.uid]: SARAH.name },
    memberIcons: { [CHRIS.uid]: CHRIS.icon, [SARAH.uid]: SARAH.icon },
    inviteCode: 'TWODO1',
    monthlyBudget: 120000, // 1.200 €
    plan: 'premium',
    premiumUntil: Timestamp.fromDate(new Date('2030-01-01')),
    premiumStore: 'promo',
    premiumUpdatedAt: at(30),
    createdAt: at(90)
    // Kategorien absichtlich weggelassen → App nutzt die Defaults.
  })

  // ── Rezepte (einige mit Likes = Favoriten für den Autopilot) ────
  const ing = (name, amount, unit) => ({ name, amount, unit })
  const recipes = [
    { id: 'r-bolo', title: 'Spaghetti Bolognese', minutes: 40, tags: ['pasta', 'meat'], likes: [CHRIS.uid, SARAH.uid],
      ingredients: [ing('Spaghetti', 500, 'g'), ing('Hackfleisch', 400, 'g'), ing('Passierte Tomaten', 400, 'g'), ing('Zwiebel', 1, 'Stk')],
      steps: ['Zwiebel anbraten', 'Hack dazu, anbraten', 'Tomaten dazu, köcheln', 'Spaghetti kochen'] },
    { id: 'r-curry', title: 'Rotes Thai-Curry', minutes: 30, tags: ['veggie', 'quick'], likes: [SARAH.uid],
      ingredients: [ing('Kokosmilch', 400, 'ml'), ing('Currypaste', 2, 'EL'), ing('Gemüse gemischt', 500, 'g'), ing('Reis', 300, 'g')],
      steps: ['Reis kochen', 'Currypaste anrösten', 'Kokosmilch + Gemüse köcheln'] },
    { id: 'r-flamm', title: 'Flammkuchen', minutes: 25, tags: ['quick', 'fakeaway'], likes: [CHRIS.uid],
      ingredients: [ing('Flammkuchenteig', 1, 'Stk'), ing('Crème fraîche', 200, 'g'), ing('Speck', 150, 'g'), ing('Zwiebel', 1, 'Stk')],
      steps: ['Teig bestreichen', 'Belegen', '12 Min backen'] },
    { id: 'r-chili', title: 'Chili sin Carne', minutes: 45, tags: ['veggie', 'mealprep'], likes: [],
      ingredients: [ing('Kidneybohnen', 400, 'g'), ing('Mais', 200, 'g'), ing('Passierte Tomaten', 400, 'g'), ing('Paprika', 2, 'Stk')],
      steps: ['Gemüse würfeln', 'Alles köcheln', 'Würzen'] },
    { id: 'r-ofen', title: 'Ofengemüse mit Feta', minutes: 35, tags: ['veggie'], likes: [SARAH.uid],
      ingredients: [ing('Kartoffeln', 600, 'g'), ing('Zucchini', 2, 'Stk'), ing('Feta', 200, 'g'), ing('Olivenöl', 3, 'EL')],
      steps: ['Gemüse schneiden', 'Mit Öl mischen', '30 Min backen', 'Feta drüber'] },
    { id: 'r-wok', title: 'Hähnchen-Wok mit Reis', minutes: 25, tags: ['quick', 'meat'], likes: [],
      ingredients: [ing('Hähnchenbrust', 400, 'g'), ing('Wokgemüse', 400, 'g'), ing('Sojasauce', 3, 'EL'), ing('Reis', 300, 'g')],
      steps: ['Reis kochen', 'Hähnchen anbraten', 'Gemüse dazu', 'Sojasauce'] },
    { id: 'r-pizza', title: 'Pizza Margherita', minutes: 50, tags: ['datenight'], likes: [CHRIS.uid, SARAH.uid],
      ingredients: [ing('Pizzateig', 1, 'Stk'), ing('Mozzarella', 250, 'g'), ing('Passierte Tomaten', 200, 'g'), ing('Basilikum', 1, 'Bund')],
      steps: ['Teig ausrollen', 'Belegen', 'Heiß backen'] },
    { id: 'r-linsen', title: 'Linseneintopf', minutes: 40, tags: ['mealprep', 'veggie'], likes: [],
      ingredients: [ing('Linsen', 300, 'g'), ing('Karotten', 3, 'Stk'), ing('Kartoffeln', 300, 'g'), ing('Gemüsebrühe', 1, 'l')],
      steps: ['Gemüse würfeln', 'Alles köcheln bis weich'] },
    { id: 'r-omelett', title: 'Käse-Omelett', minutes: 15, tags: ['quick'], likes: [],
      ingredients: [ing('Eier', 4, 'Stk'), ing('Käse gerieben', 100, 'g'), ing('Butter', 20, 'g')],
      steps: ['Eier verquirlen', 'In Butter braten', 'Käse dazu'] },
    { id: 'r-lachs', title: 'Ofenlachs mit Brokkoli', minutes: 30, tags: ['quick'], likes: [SARAH.uid],
      ingredients: [ing('Lachsfilet', 2, 'Stk'), ing('Brokkoli', 500, 'g'), ing('Zitrone', 1, 'Stk')],
      steps: ['Brokkoli dämpfen', 'Lachs 15 Min backen', 'Mit Zitrone servieren'] },
  ]
  await seedDocs('recipes', recipes.map((r) => ({
    id: r.id, title: r.title, description: '', minutes: r.minutes, servings: 2,
    tags: r.tags, likes: r.likes, ingredients: r.ingredients, steps: r.steps,
    nutrition: null, source: 'manual', createdBy: CHRIS.uid, createdAt: at(60), updatedAt: at(20)
  })))

  // ── Wochenplan: 3 kürzlich gekochte Tage (Autopilot soll sie MEIDEN),
  //    2 leere Tage diese Woche (Standard-Auswahl füllt Lücken) ────
  const meals = [
    { dateKey: dateKey(-3), recipeId: 'r-bolo', cook: CHRIS.uid },
    { dateKey: dateKey(-2), recipeId: 'r-curry', cook: SARAH.uid },
    { dateKey: dateKey(-1), recipeId: 'r-flamm', cook: 'both' },
    { dateKey: dateKey(mondayOffset + 1), recipeId: 'r-pizza', cook: 'both' }, // Dienstag diese Woche belegt
  ]
  await seedDocs('mealPlans', meals.map((m) => ({
    dateKey: m.dateKey, recipeId: m.recipeId, cookAssignee: m.cook,
    createdBy: CHRIS.uid, createdAt: at(4), updatedAt: at(4)
  })))

  // ── Aufgaben ───────────────────────────────────────────────────
  const chores = [
    { id: 'c-spuel', name: 'Spülmaschine ausräumen', room: 'kueche', type: 'recurring', assignee: CHRIS.uid, points: 5 },
    { id: 'c-muell', name: 'Müll rausbringen', room: 'muell', type: 'recurring', assignee: SARAH.uid, points: 5 },
    { id: 'c-bad', name: 'Bad putzen', room: 'badezimmer', type: 'recurring', assignee: 'both', points: 20 },
    { id: 'c-saugen', name: 'Staubsaugen', room: 'wohnzimmer', type: 'recurring', assignee: CHRIS.uid, points: 10 },
    { id: 'c-waesche', name: 'Wäsche waschen', room: 'waesche', type: 'recurring', assignee: SARAH.uid, points: 10 },
    { id: 'c-pflanzen', name: 'Pflanzen gießen', room: 'pflanzen', type: 'recurring', assignee: null, points: 5 },
    { id: 'c-lampe', name: 'Lampe im Flur reparieren', room: 'allgemein', type: 'once', assignee: CHRIS.uid, points: 20 },
  ]
  await seedDocs('chores', chores.map((c) => ({
    id: c.id, name: c.name, room: c.room, type: c.type, assignee: c.assignee, points: c.points,
    done: false, completedAt: null, completedBy: null,
    createdBy: CHRIS.uid, createdAt: at(50), updatedAt: at(50)
  })))

  // Verlauf: gemischt über die letzten ~2 Wochen, mit 'both'-Einträgen.
  const history = [
    { choreId: 'c-spuel', name: 'Spülmaschine ausräumen', by: CHRIS.uid, points: 5, daysAgo: 1 },
    { choreId: 'c-muell', name: 'Müll rausbringen', by: SARAH.uid, points: 5, daysAgo: 1 },
    { choreId: 'c-saugen', name: 'Staubsaugen', by: CHRIS.uid, points: 10, daysAgo: 2 },
    { choreId: 'c-bad', name: 'Bad putzen', by: 'both', points: 20, daysAgo: 3 },
    { choreId: 'c-waesche', name: 'Wäsche waschen', by: SARAH.uid, points: 10, daysAgo: 4 },
    { choreId: 'c-spuel', name: 'Spülmaschine ausräumen', by: SARAH.uid, points: 5, daysAgo: 5 }, // Vertretung
    { choreId: 'c-muell', name: 'Müll rausbringen', by: SARAH.uid, points: 5, daysAgo: 6 },
    { choreId: 'c-saugen', name: 'Staubsaugen', by: CHRIS.uid, points: 10, daysAgo: 9 },
    { choreId: 'c-bad', name: 'Bad putzen', by: 'both', points: 20, daysAgo: 11 },
    { choreId: 'c-spuel', name: 'Spülmaschine ausräumen', by: CHRIS.uid, points: 5, daysAgo: 13 },
  ]
  await seedDocs('choreHistory', history.map((h) => ({
    choreId: h.choreId, choreName: h.name, completedBy: h.by, points: h.points,
    completedAt: at(h.daysAgo), createdAt: at(h.daysAgo)
  })))

  // ── Einkaufslisten + Artikel ───────────────────────────────────
  await seedDocs('shoppingLists', [
    { id: 'l-woche', title: 'Wocheneinkauf', archived: false, createdBy: CHRIS.uid, createdAt: at(40), updatedAt: at(1) },
    { id: 'l-baumarkt', title: 'Baumarkt', archived: false, createdBy: SARAH.uid, createdAt: at(20), updatedAt: at(5) },
  ])
  const items = [
    { list: 'l-woche', name: 'Milch', amount: 2, unit: 'l', cat: 'lebensmittel', checked: false },
    { list: 'l-woche', name: 'Brot', amount: 1, unit: 'Stk', cat: 'lebensmittel', checked: false },
    { list: 'l-woche', name: 'Äpfel', amount: 6, unit: 'Stk', cat: 'obst', checked: true },
    { list: 'l-woche', name: 'Kaffee', amount: 1, unit: 'Pkg', cat: 'lebensmittel', checked: false },
    { list: 'l-baumarkt', name: 'Schrauben', amount: 1, unit: 'Pkg', cat: 'sonstiges', checked: false },
    { list: 'l-baumarkt', name: 'Farbe weiß', amount: 1, unit: 'Eimer', cat: 'sonstiges', checked: false },
  ]
  await seedDocs('shoppingItems', items.map((it) => ({
    listId: it.list, name: it.name, amount: it.amount, unit: it.unit, category: it.cat,
    checked: it.checked, checkedBy: it.checked ? SARAH.uid : null,
    addedBy: CHRIS.uid, source: 'manual', sourceWeekKey: null, expenseId: null,
    createdAt: at(3), updatedAt: at(1)
  })))

  // ── Finanzen: Event + Ausgaben (this + last month, gemischt bezahlt) ──
  await seedDocs('financeEvents', [
    { id: 'e-italien', title: 'Urlaub Italien', kind: 'event', category: 'freizeit', archived: false,
      budget: 150000, createdBy: SARAH.uid, createdAt: at(25), updatedAt: at(10), archivedAt: null },
  ])
  const half = (a) => ({ [CHRIS.uid]: Math.round(a / 2), [SARAH.uid]: Math.round(a / 2) })
  const expenses = [
    { title: 'Wocheneinkauf', amount: 8450, cat: 'lebensmittel', paidBy: CHRIS.uid, event: null, m: 0, paid: false, daysAgo: 2 },
    { title: 'Restaurant', amount: 6200, cat: 'freizeit', paidBy: SARAH.uid, event: null, m: 0, paid: false, daysAgo: 5 },
    { title: 'Tanken', amount: 7000, cat: 'mobilitaet', paidBy: CHRIS.uid, event: null, m: 0, paid: true, daysAgo: 8 },
    { title: 'Stromabschlag', amount: 9500, cat: 'wohnen', paidBy: SARAH.uid, event: null, m: 0, paid: false, daysAgo: 12 },
    { title: 'Drogerie', amount: 3300, cat: 'lebensmittel', paidBy: CHRIS.uid, event: null, m: 1, paid: true, daysAgo: 34 },
    { title: 'Kino', amount: 2800, cat: 'freizeit', paidBy: SARAH.uid, event: null, m: 1, paid: true, daysAgo: 38 },
    { title: 'Hotel Anzahlung', amount: 45000, cat: 'freizeit', paidBy: SARAH.uid, event: 'e-italien', m: 0, paid: false, daysAgo: 15 },
    { title: 'Zugtickets', amount: 12000, cat: 'mobilitaet', paidBy: CHRIS.uid, event: 'e-italien', m: 0, paid: false, daysAgo: 14 },
  ]
  await seedDocs('expenses', expenses.map((x) => ({
    title: x.title, amount: x.amount, owedBy: half(x.amount), category: x.cat, paidBy: x.paidBy,
    eventId: x.event, monthKey: monthKey(x.m), source: 'manual', shoppingListId: null, shoppingItemIds: [],
    isPaid: x.paid, createdBy: x.paidBy, createdAt: at(x.daysAgo), updatedAt: at(x.daysAgo)
  })))

  // ── Belegung: Ressourcen + Buchungen (inkl. wöchentliche Serie) ──
  await seedDocs('resources', [
    { id: 'res-auto', name: 'Auto', emoji: '🚗', createdBy: CHRIS.uid, createdAt: at(40), updatedAt: at(40) },
    { id: 'res-bike', name: 'E-Bike', emoji: '🚲', createdBy: SARAH.uid, createdAt: at(35), updatedAt: at(35) },
  ])
  const wd = (dk) => { const [y, m, d] = dk.split('-').map(Number); const day = new Date(y, m - 1, d).getDay(); return day === 0 ? 6 : day - 1 }
  const bk1 = dateKey(mondayOffset + 2) // Mittwoch diese Woche
  const bk2 = dateKey(mondayOffset + 4) // Freitag diese Woche
  await seedDocs('bookings', [
    { resourceId: 'res-auto', owner: CHRIS.uid, date: bk1, weekday: wd(bk1), allDay: false, start: '08:00', end: '10:00',
      repeat: 'none', note: 'Zum Zahnarzt', createdBy: CHRIS.uid, createdAt: at(3), updatedAt: at(3) },
    { resourceId: 'res-bike', owner: SARAH.uid, date: bk2, weekday: wd(bk2), allDay: false, start: '18:00', end: '20:00',
      repeat: 'weekly', note: 'Sport', createdBy: SARAH.uid, createdAt: at(30), updatedAt: at(30) },
  ])

  // ── Ideen / Reisen / Notizen ───────────────────────────────────
  await seedDocs('bucketListItems', [
    { category: 'film', name: 'Dune Teil 2 schauen', note: '', done: false, suggestedBy: CHRIS.uid, createdBy: CHRIS.uid, createdAt: at(20), updatedAt: at(20) },
    { category: 'essen', name: 'Neues Ramen-Lokal testen', note: 'in der Innenstadt', done: false, suggestedBy: SARAH.uid, createdBy: SARAH.uid, createdAt: at(15), updatedAt: at(15) },
    { category: 'date', name: 'Wochenende wandern', note: '', done: true, suggestedBy: CHRIS.uid, createdBy: CHRIS.uid, createdAt: at(45), updatedAt: at(10) },
  ])
  await seedDocs('trips', [
    { title: 'Wochenende Amsterdam', when: 'Sept.', startDate: dateKey(60), endDate: dateKey(62), location: 'Amsterdam',
      notes: 'Fahrräder mieten', links: [], checklist: [{ text: 'Hotel buchen', done: true }, { text: 'Zug buchen', done: false }],
      emoji: '🚲', createdBy: SARAH.uid, createdAt: at(30), updatedAt: at(5) },
  ])
  await seedDocs('notes', [
    { text: 'WLAN-Passwort: Sonnenschein42', createdBy: CHRIS.uid, createdAt: at(12), updatedAt: at(12) },
    { text: 'Geschenkidee Mama: Wellness-Gutschein', createdBy: SARAH.uid, createdAt: at(8), updatedAt: at(8) },
  ])

  console.log('\n✅ Testdaten geladen.')
  console.log('   Paar:      Premium bis 2030, Budget 1.200 €')
  console.log(`   Login A:   ${CHRIS.email}  /  ${PASSWORD}`)
  console.log(`   Login B:   ${SARAH.email}  /  ${PASSWORD}`)
  console.log('   Rezepte:   10 (Favoriten: Bolognese, Pizza, Curry, Flammkuchen, Ofengemüse, Lachs)')
  console.log('   Wochenplan: 3 kürzlich gekochte Tage + Dienstag belegt → Autopilot füllt den Rest\n')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
