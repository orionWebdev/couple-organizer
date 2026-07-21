// Free-Limits. Die reinen Zähl-Limits (Listen, Ressourcen, Rezepte, Verlauf)
// sind clientseitig — Firestore-Rules können keine Dokumente zählen. Sie sind
// Produkt-Grenzen, keine Sicherheitsgrenzen; wer sie umgeht, kostet uns nichts.
//
// Die KI-Limits stehen hier NUR zur Anzeige. Durchgesetzt werden sie in
// functions/src/lib/limits.ts — die beiden Dateien müssen übereinstimmen.
export const FREE_LIMITS = {
  shoppingLists: 2,
  belegungResources: 1,
  recipeCount: 10,
  choreHistoryMonths: 2,
  aiRecipesPerMonth: 3,
  coachPerMonth: 1
} as const

export type PremiumFeature =
  | 'shoppingLists'
  | 'belegungResources'
  | 'recipeCount'
  | 'choreHistory'
  | 'financeCoach'
  | 'aiRecipes'
  | 'weekPlan'
  | 'choreBalance'
  | 'export'

interface PaywallCopy {
  title: string
  body: string
}

export const PAYWALL_COPY: Record<PremiumFeature, PaywallCopy> = {
  shoppingLists: {
    title: 'Mehr Einkaufslisten',
    body: `Mit TwoDo Plus legt ihr beliebig viele Listen an — Wocheneinkauf, Baumarkt, Vorrat. Kostenlos sind ${FREE_LIMITS.shoppingLists} Listen.`
  },
  belegungResources: {
    title: 'Mehr geteilte Ressourcen',
    body: `Auto, E-Bike, Waschmaschine, Hund — mit TwoDo Plus tragt ihr beliebig viele Ressourcen ein. Kostenlos ist ${FREE_LIMITS.belegungResources}.`
  },
  recipeCount: {
    title: 'Unbegrenztes Rezept-Wiki',
    body: `Euer Rezeptbuch wächst mit euch. Kostenlos speichert ihr ${FREE_LIMITS.recipeCount} Rezepte, mit TwoDo Plus so viele ihr wollt.`
  },
  choreHistory: {
    title: 'Kompletter Verlauf',
    body: `Kostenlos seht ihr die letzten ${FREE_LIMITS.choreHistoryMonths} Monate. TwoDo Plus zeigt euren gesamten Haushalts-Verlauf.`
  },
  financeCoach: {
    title: 'Finanz-Coach',
    body: `Der Coach liest euren Monat im Zusammenhang: Budget, wer wie viel ausgelegt hat und was zwischen euch offen steht — und sagt, was als Nächstes dran ist. Kostenlos ist ${FREE_LIMITS.coachPerMonth}× im Monat.`
  },
  aiRecipes: {
    title: 'KI-Rezeptvorschläge',
    body: `Kostenlos sind ${FREE_LIMITS.aiRecipesPerMonth} Vorschläge pro Monat. Mit TwoDo Plus schlägt euch die KI jeden Tag etwas Neues vor.`
  },
  weekPlan: {
    title: 'Wochen-Autopilot',
    body: 'Ein Tap, und die KI plant euren ganzen Essensplan für die Woche — abwechslungsreich und passend zu euren Vorlieben. Nur mit TwoDo Plus.'
  },
  choreBalance: {
    title: 'Aufgaben fair verteilen',
    body: 'TwoDo Plus verteilt eure wiederkehrenden Aufgaben automatisch fair — nach dem, wer zuletzt mehr gemacht hat, und wer diese Woche unterwegs ist.'
  },
  export: {
    title: 'Daten exportieren',
    body: 'Ausgaben als CSV, Belegungen als Kalender-Datei — mit TwoDo Plus nehmt ihr eure Daten überall mit hin.'
  }
}
