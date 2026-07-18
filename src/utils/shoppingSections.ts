import type { ShoppingItem } from '@/types'

// Läden-Bereiche für die Gruppierung der Einkaufsliste. `keywords` sind
// Teilstrings (kleingeschrieben), über die ein Artikel automatisch einem Bereich
// zugeordnet wird, wenn beim Anlegen keine Kategorie mitgegeben wurde.
export interface ShoppingSection {
  id: string
  label: string
  emoji: string
  keywords: readonly string[]
}

export const SHOPPING_SECTIONS: readonly ShoppingSection[] = [
  {
    id: 'obst-gemuese',
    label: 'Obst & Gemüse',
    emoji: '🥬',
    keywords: [
      'apfel', 'äpfel', 'banane', 'zitrone', 'limette', 'orange', 'beere', 'erdbeer',
      'trauben', 'birne', 'pfirsich', 'melone', 'kiwi', 'mango', 'avocado',
      'tomate', 'gurke', 'salat', 'paprika', 'zwiebel', 'knoblauch', 'kartoffel',
      'möhre', 'karotte', 'brokkoli', 'blumenkohl', 'spinat', 'zucchini', 'aubergine',
      'pilz', 'champignon', 'lauch', 'sellerie', 'ingwer', 'kräuter', 'basilikum',
      'petersilie', 'schnittlauch', 'rucola', 'kohl', 'kürbis', 'bohnen', 'erbsen',
    ],
  },
  {
    id: 'kuehlregal',
    label: 'Kühlregal',
    emoji: '🧀',
    keywords: [
      'milch', 'butter', 'käse', 'parmesan', 'joghurt', 'quark', 'sahne', 'schmand',
      'frischkäse', 'mozzarella', 'feta', 'ei', 'eier', 'wurst', 'schinken', 'salami',
      'hack', 'hähnchen', 'hühnchen', 'pute', 'rind', 'schwein', 'fisch', 'lachs',
      'tofu', 'margarine', 'creme fraiche', 'crème', 'pudding', 'aufschnitt',
    ],
  },
  {
    id: 'vorrat',
    label: 'Vorrat',
    emoji: '🍝',
    keywords: [
      'nudel', 'spaghetti', 'pasta', 'reis', 'mehl', 'zucker', 'salz', 'pfeffer',
      'öl', 'olivenöl', 'essig', 'linsen', 'bohnen', 'kichererbsen', 'dose',
      'tomatenmark', 'passierte', 'brühe', 'gewürz', 'haferflocken', 'müsli',
      'cornflakes', 'honig', 'marmelade', 'nutella', 'erdnuss', 'couscous',
      'polenta', 'backpulver', 'vanille', 'schokolade', 'kekse', 'chips', 'kaffee', 'tee',
    ],
  },
  {
    id: 'tiefkuehl',
    label: 'Tiefkühl',
    emoji: '🧊',
    keywords: ['tiefkühl', 'tk ', 'pizza', 'pommes', 'eis', 'spinat tk', 'gefrier'],
  },
  {
    id: 'getraenke',
    label: 'Getränke',
    emoji: '🥤',
    keywords: ['wasser', 'saft', 'cola', 'limo', 'bier', 'wein', 'sekt', 'getränk', 'sprudel', 'schorle'],
  },
  {
    id: 'haushalt',
    label: 'Haushalt & Drogerie',
    emoji: '🧻',
    keywords: [
      'klopapier', 'toilettenpapier', 'küchenrolle', 'spülmittel', 'waschmittel',
      'putz', 'seife', 'shampoo', 'duschgel', 'zahnpasta', 'zahnbürste', 'windel',
      'müllbeutel', 'taschentücher', 'schwamm', 'deo', 'creme',
    ],
  },
  {
    id: 'sonstiges',
    label: 'Sonstiges',
    emoji: '📦',
    keywords: [],
  },
]

const SECTION_BY_ID = new Map(SHOPPING_SECTIONS.map((s) => [s.id, s]))
const FALLBACK = SHOPPING_SECTIONS[SHOPPING_SECTIONS.length - 1] // 'sonstiges'

// Ordnungsindex für die feste Anzeige-Reihenfolge der Bereiche.
export function sectionOrder(id: string): number {
  const idx = SHOPPING_SECTIONS.findIndex((s) => s.id === id)
  return idx === -1 ? SHOPPING_SECTIONS.length : idx
}

export function sectionDef(id: string): ShoppingSection {
  return SECTION_BY_ID.get(id) ?? FALLBACK
}

// Leitet aus dem Artikelnamen einen Bereich ab (erster Keyword-Treffer gewinnt).
export function sectionForName(name: string): string {
  const n = name.toLowerCase()
  for (const section of SHOPPING_SECTIONS) {
    if (section.keywords.some((k) => n.includes(k))) return section.id
  }
  return FALLBACK.id
}

// Bereich eines Items: eine bereits gesetzte, bekannte Bereichs-ID gewinnt,
// sonst wird aus dem Namen abgeleitet (fängt auch Altbestand mit 'Sonstiges' ab).
export function sectionOfItem(item: Pick<ShoppingItem, 'category' | 'name'>): string {
  if (item.category && SECTION_BY_ID.has(item.category)) return item.category
  return sectionForName(item.name)
}
