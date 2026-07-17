<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useBelegung } from '@/composables/useBelegung'
import { useExpenses } from '@/composables/useExpenses'
import { useBucketList } from '@/composables/useBucketList'
import { useMealPlan } from '@/composables/useMealPlan'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import { resolveExpenseCategories, EXPENSE_CATEGORY_ICON_CHOICES, categoryColor } from '@/utils/expenseCategories'
import { resolveIdeaCategories, ideaCategory, IDEA_ICON_CHOICES } from '@/utils/ideen'
import { resolveRecipeCategories, RECIPE_ICON_CHOICES } from '@/utils/recipeTags'
import { RESOURCE_ICONS } from '@/utils/belegung'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconGridPicker from '@/components/ui/IconGridPicker.vue'

// Eine Seite für alle vier Listen, die bisher die Settings-Seite lang gemacht
// haben. Sie unterscheiden sich nur in Datenquelle, Icon-Vorrat und Wortwahl —
// die Mechanik (Zeile antippen = bearbeiten, ✕ = löschen, Formular darunter)
// ist überall dieselbe.
type CategoryKind = 'ausgaben' | 'ideen' | 'rezepte' | 'belegung'

interface KindMeta {
  title: string
  intro: string
  icons: readonly string[]
  iconColumns?: number
  placeholder: string
  addLabel: string
  // Singular/Plural des Dings, das an einer Kategorie hängt.
  countNoun: [string, string]
  // Was mit diesen Dingen beim Löschen passiert.
  deleteNote: (count: number) => string
}

const META: Record<CategoryKind, KindMeta> = {
  ausgaben: {
    title: 'Ausgaben-Kategorien',
    intro: 'Womit ihr eure Ausgaben einsortiert — im Finanzen-Tab und beim Einkauf.',
    icons: EXPENSE_CATEGORY_ICON_CHOICES,
    placeholder: 'z. B. Lebensmittel, Auto, Urlaub …',
    addLabel: '+ Kategorie hinzufügen',
    countNoun: ['Ausgabe', 'Ausgaben'],
    deleteNote: (n) =>
      `Die ${n} ${n === 1 ? 'zugehörige Ausgabe bleibt' : 'zugehörigen Ausgaben bleiben'} erhalten, ${n === 1 ? 'wird' : 'werden'} aber ohne Kategorie angezeigt.`,
  },
  ideen: {
    title: 'Ideen-Kategorien',
    intro: 'Die Schubladen für „Ideen für uns" im Planung-Tab.',
    icons: IDEA_ICON_CHOICES,
    placeholder: 'z. B. Konzerte, Wandern, Museen …',
    addLabel: '+ Kategorie hinzufügen',
    countNoun: ['Idee', 'Ideen'],
    deleteNote: (n) =>
      `Die ${n} ${n === 1 ? 'zugehörige Idee bleibt' : 'zugehörigen Ideen bleiben'} erhalten, ${n === 1 ? 'wird' : 'werden'} aber nur noch unter „Alle" angezeigt.`,
  },
  rezepte: {
    title: 'Rezept-Kategorien',
    intro: 'Die Filter im Rezept-Wiki. Jede Kategorie bekommt beim Anlegen ihre Farbe.',
    icons: RECIPE_ICON_CHOICES,
    placeholder: 'z. B. Grillen, Suppen, Sonntagsessen …',
    addLabel: '+ Kategorie hinzufügen',
    countNoun: ['Rezept', 'Rezepte'],
    deleteNote: (n) =>
      `Die ${n} ${n === 1 ? 'zugehörige Rezept bleibt' : 'zugehörigen Rezepte bleiben'} erhalten, ${n === 1 ? 'verliert' : 'verlieren'} aber diese Kategorie.`,
  },
  belegung: {
    title: 'Geteilte Ressourcen',
    intro: 'Die Dinge, die ihr euch teilt — Auto, E-Bike, Waschmaschine, „Gassi“.',
    icons: RESOURCE_ICONS,
    iconColumns: 7,
    placeholder: 'z. B. Auto, Wohnmobil, Bohrmaschine …',
    addLabel: '+ Ressource hinzufügen',
    countNoun: ['Belegung', 'Belegungen'],
    deleteNote: (n) =>
      `Die ${n} ${n === 1 ? 'zugehörige Belegung wird' : 'zugehörigen Belegungen werden'} mit gelöscht.`,
  },
}

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const {
  couple,
  addExpenseCategory, updateExpenseCategory, removeExpenseCategory,
  addIdeaCategory, updateIdeaCategory, removeIdeaCategory,
  addRecipeCategory, updateRecipeCategory, removeRecipeCategory,
} = useCouple()

const kind = computed<CategoryKind>(() => {
  const raw = route.params.type as string
  return raw in META ? (raw as CategoryKind) : 'ausgaben'
})
const meta = computed(() => META[kind.value])

// Jede Liste braucht nur ihre eigene Datenquelle. Die Composables hören auf
// coupleId — wer nicht dran ist, bekommt `null` und legt gar keinen Listener an.
const coupleId = computed(() => user.value?.coupleId ?? null)
const idFor = (k: CategoryKind) => computed(() => (kind.value === k ? coupleId.value : null))

const { expenses } = useExpenses(idFor('ausgaben'))
const { items: ideas } = useBucketList(idFor('ideen'))
const { recipes } = useMealPlan(idFor('rezepte'))
const {
  resources, canAddResource, countBookings, addResource, updateResource, deleteResource,
} = useBelegung(idFor('belegung'))

interface Entry {
  id: string
  label: string
  emoji: string
  color: string | null
  count: number
}

const entries = computed<Entry[]>(() => {
  switch (kind.value) {
    case 'ausgaben': {
      const cats = resolveExpenseCategories(couple.value)
      return cats.map((c) => ({
        id: c.id,
        label: c.name,
        emoji: c.icon,
        color: categoryColor(cats, c.id),
        count: expenses.value.filter((e) => e.category === c.id).length,
      }))
    }
    case 'ideen': {
      const cats = resolveIdeaCategories(couple.value)
      return cats.map((c) => ({
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        color: null,
        count: ideas.value.filter((i) => ideaCategory(i.category, cats) === c.id).length,
      }))
    }
    case 'rezepte':
      return resolveRecipeCategories(couple.value).map((c) => ({
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        color: c.color,
        count: recipes.value.filter((r) => r.tags.includes(c.id)).length,
      }))
    case 'belegung':
      return resources.value.map((r) => ({
        id: r.id,
        label: r.name,
        emoji: r.emoji,
        color: null,
        count: countBookings(r.id),
      }))
  }
})

// ── Anlegen/Bearbeiten ────────────────────────────────────────
interface EntryForm { id: string | null; label: string; emoji: string }
const form = ref<EntryForm | null>(null)
const pendingDelete = ref<Entry | null>(null)

function startNew() {
  // Ressourcen sind das einzige Limit hier — die Kategorienlisten sind frei.
  if (kind.value === 'belegung' && !canAddResource.value) {
    showPaywall('belegungResources')
    return
  }
  form.value = { id: null, label: '', emoji: meta.value.icons[0] }
}

function startEdit(entry: Entry) {
  form.value = { id: entry.id, label: entry.label, emoji: entry.emoji }
}

async function save() {
  const f = form.value
  if (!f?.label.trim()) return

  const ok = await (() => {
    switch (kind.value) {
      case 'ausgaben':
        return f.id ? updateExpenseCategory(f.id, f.label, f.emoji) : addExpenseCategory(f.label, f.emoji)
      case 'ideen':
        return f.id ? updateIdeaCategory(f.id, f.label, f.emoji) : addIdeaCategory(f.label, f.emoji)
      case 'rezepte':
        return f.id ? updateRecipeCategory(f.id, f.label, f.emoji) : addRecipeCategory(f.label, f.emoji)
      case 'belegung':
        return f.id
          ? updateResource(f.id, f.label, f.emoji).then((r) => !!r)
          : addResource(f.label, f.emoji).then((r) => !!r)
    }
  })()

  if (ok) {
    showToast(f.id ? 'Gespeichert' : `${f.emoji} ${f.label.trim()} angelegt`)
    form.value = null
  } else {
    showToast('Fehler beim Speichern')
  }
}

async function confirmDelete() {
  const entry = pendingDelete.value
  if (!entry) return

  const ok = await (() => {
    switch (kind.value) {
      case 'ausgaben': return removeExpenseCategory(entry.id)
      case 'ideen': return removeIdeaCategory(entry.id)
      case 'rezepte': return removeRecipeCategory(entry.id)
      case 'belegung': return deleteResource(entry.id)
    }
  })()

  // Ausgaben und Ideen brauchen zwingend eine Kategorie — dort ist die letzte
  // nicht löschbar, und genau daran scheitert es in der Praxis. Rezepte und
  // Ressourcen dürfen auf null gehen; ein Fehlschlag ist dort ein echter Fehler.
  const failure = kind.value === 'ausgaben' || kind.value === 'ideen'
    ? 'Das geht nicht — mindestens eine Kategorie muss bleiben'
    : 'Fehler beim Löschen'

  showToast(ok ? 'Gelöscht' : failure)
  pendingDelete.value = null
  if (ok && form.value?.id === entry.id) form.value = null
}

function countLabel(entry: Entry): string {
  const [one, many] = meta.value.countNoun
  return `${entry.count} ${entry.count === 1 ? one : many}`
}
</script>

<template>
  <div class="kategorien-page">
    <div class="detail-header">
      <button class="back-caret" type="button" @click="router.push('/settings')" aria-label="Zurück">‹</button>
      <span class="page-title">{{ meta.title }}</span>
    </div>

    <div class="kategorien-scroll">
      <p class="intro">{{ meta.intro }}</p>

      <div class="card">
        <p v-if="!entries.length" class="empty-hint">
          Noch nichts angelegt.
        </p>
        <div v-else class="entry-list">
          <div v-for="e in entries" :key="e.id" class="entry-row">
            <span
              class="entry-icon"
              :class="{ 'entry-icon--plain': !e.color }"
              :style="e.color ? { background: e.color } : undefined"
            >{{ e.emoji }}</span>
            <button class="entry-btn" type="button" @click="startEdit(e)">
              <span class="entry-name">{{ e.label }}</span>
              <span class="entry-count">{{ countLabel(e) }}</span>
            </button>
            <button class="remove-btn" type="button" aria-label="Entfernen" @click="pendingDelete = e">✕</button>
          </div>
        </div>

        <button v-if="!form" class="text-btn" type="button" @click="startNew">
          {{ meta.addLabel }}
        </button>
        <template v-else>
          <input
            v-model="form.label"
            class="app-field name-field"
            type="text"
            :placeholder="meta.placeholder"
            @keyup.enter="save"
          />
          <IconGridPicker v-model="form.emoji" :icons="meta.icons" :columns="meta.iconColumns" />
          <div class="form-actions">
            <button class="text-btn" type="button" @click="form = null">Abbrechen</button>
            <button class="btn-primary save-btn" type="button" :disabled="!form.label.trim()" @click="save">
              {{ form.id ? 'Speichern' : 'Anlegen' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <BottomSheet :isOpen="!!pendingDelete" title="Wirklich löschen?" @close="pendingDelete = null">
      <p class="confirm-text">
        „{{ pendingDelete?.label }}“ löschen?
        <template v-if="pendingDelete?.count">{{ meta.deleteNote(pendingDelete.count) }}</template>
      </p>
      <div class="confirm-actions">
        <button class="text-btn confirm-cancel" type="button" @click="pendingDelete = null">Abbrechen</button>
        <button class="btn-primary confirm-yes" type="button" @click="confirmDelete">Ja, löschen</button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.kategorien-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.back-caret {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.page-title {
  font-family: var(--font-headline);
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
}

.kategorien-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--screen-pad) 32px;
}

.intro {
  margin: 4px 0 16px;
  font-size: 12.5px;
  color: var(--text-meta);
  line-height: 1.5;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 18px;
}

.empty-hint {
  margin: 0 0 4px;
  font-size: 12.5px;
  color: var(--text-meta);
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.entry-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 15px;
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

/* Ideen und Ressourcen tragen keine eigene Farbe — sie bekommen die neutrale
   Kachel statt eines gefärbten Kreises. */
.entry-icon--plain {
  border: none;
  box-shadow: none;
  border-radius: 10px;
  background: var(--surface-deep);
  font-size: 16px;
}

.entry-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.entry-name {
  max-width: 100%;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-count {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.remove-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 12px;
  cursor: pointer;
}

.text-btn {
  display: block;
  margin-top: 14px;
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.name-field {
  margin: 14px 0 10px;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.form-actions .text-btn {
  margin-top: 0;
}

.save-btn {
  width: auto;
  padding: 10px 18px;
}

.confirm-text {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 18px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-cancel {
  flex: 1;
  margin-top: 0;
  text-align: center;
  padding: 13px;
  background: var(--surface-deep);
  border-radius: 14px;
}

.confirm-yes {
  flex: 1;
  background: var(--danger);
  box-shadow: none;
}
</style>
