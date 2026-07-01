import type { ChoreRoom } from '@/types'

export interface PoolSeedTask {
  name: string
  room: ChoreRoom
}

// Standard-Aufgabenpool, gruppiert nach Raum. Wird per seedPool() einmalig
// in Firestore angelegt und ist danach ganz normal editier-/löschbar.
export const POOL_SEED: readonly PoolSeedTask[] = [
  // Allgemein
  { room: 'allgemein', name: 'Abtropfkanne leeren' },
  { room: 'allgemein', name: 'Abwaschen' },
  { room: 'allgemein', name: 'Aerosol-/Sprayregal' },
  { room: 'allgemein', name: 'Backofen reinigen' },

  // Küche
  { room: 'kueche', name: 'Gespült' },
  { room: 'kueche', name: 'Herdplatte reinigen' },
  { room: 'kueche', name: 'Küche aufräumen' },
  { room: 'kueche', name: 'Küchenboden wischen' },
  { room: 'kueche', name: 'Kühlschrank putzen' },
  { room: 'kueche', name: 'Mikrowelle reinigen' },
  { room: 'kueche', name: 'Spüle reinigen' },
  { room: 'kueche', name: 'Spülmaschine ausräumen' },

  // Wohnzimmer
  { room: 'wohnzimmer', name: 'Deko säubern' },
  { room: 'wohnzimmer', name: 'Wohnzimmer abstauben' },
  { room: 'wohnzimmer', name: 'Wohnzimmer aufräumen' },
  { room: 'wohnzimmer', name: 'Wohnzimmer saugen' },

  // Schlafzimmer
  { room: 'schlafzimmer', name: 'Bett machen' },
  { room: 'schlafzimmer', name: 'Schlafzimmer aufräumen' },
  { room: 'schlafzimmer', name: 'Schlafzimmer saugen' },

  // Badezimmer
  { room: 'badezimmer', name: 'Badwäsche wechseln' },
  { room: 'badezimmer', name: 'Badezimmerspiegel putzen' },
  { room: 'badezimmer', name: 'Dusche putzen' },
  { room: 'badezimmer', name: 'Handtücher wechseln' },
  { room: 'badezimmer', name: 'Toilette putzen' },
  { room: 'badezimmer', name: 'Waschbecken putzen' },

  // Wäsche
  { room: 'waesche', name: 'Wäsche aufhängen' },
  { room: 'waesche', name: 'Wäsche waschen' },
  { room: 'waesche', name: 'Wäsche zusammenlegen und einräumen' },

  // Müll
  { room: 'muell', name: 'Müll rausbringen' },
  { room: 'muell', name: 'Mülleimer reinigen' },

  // Einkaufen
  { room: 'einkaufen', name: 'Einkäufe einräumen' },
  { room: 'einkaufen', name: 'Einkaufen gehen' },

  // Pflanzen
  { room: 'pflanzen', name: 'Zimmerpflanzen gießen' },

  // Haustiere
  { room: 'haustiere', name: 'Katzen füttern' },
  { room: 'haustiere', name: 'Katzenklo säubern' },

  // Auto
  { room: 'auto', name: 'Auto waschen' },
]
