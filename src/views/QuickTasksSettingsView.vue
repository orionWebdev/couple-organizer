<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { useFavoriteChores } from '@/composables/useFavoriteChores'
import { showToast } from '@/composables/useToast'
import type { Chore } from '@/types'
import { roomDef, roomOf, roomLabel } from '@/utils/rooms'
import { personName } from '@/utils/chores'

const router = useRouter()
const { user } = useAuth()
const { couple } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { chores, loading: choresLoading } = useChores(coupleId)
const { myFavoriteChoreIds, isFavorite, toggleFavorite, loading: favLoading } = useFavoriteChores(coupleId)

const loading = computed(() => choresLoading.value || favLoading.value)

// Erledigte Einmal-Aufgaben sind aus dem Pool raus — nur aktive verknüpfbar.
// Favoriten zuerst, dann alphabetisch, damit die eigene Auswahl oben steht.
const selectableChores = computed(() =>
  [...chores.value]
    .filter((c) => !(c.type === 'once' && c.done))
    .sort((a, b) => {
      const fa = myFavoriteChoreIds.value.has(a.id) ? 0 : 1
      const fb = myFavoriteChoreIds.value.has(b.id) ? 0 : 1
      if (fa !== fb) return fa - fb
      return a.name.localeCompare(b.name, 'de')
    })
)

const favCount = computed(() => myFavoriteChoreIds.value.size)

function goBack() {
  router.push('/settings')
}

function tileEmoji(chore: Chore): string {
  return roomDef(roomOf(chore)).icon
}

function subline(chore: Chore): string {
  const room = roomLabel(roomOf(chore))
  if (chore.assignee === null) return `${room} · offen`
  return `${room} · ${personName(chore.assignee, couple.value)}`
}

async function onToggle(chore: Chore) {
  const willAdd = !isFavorite(chore.id)
  const ok = await toggleFavorite(chore.id)
  if (!ok) {
    showToast('Fehler beim Speichern')
    return
  }
  showToast(willAdd ? 'Zu Schnell-Aufgaben hinzugefügt' : 'Entfernt')
}
</script>

<template>
  <div class="qt-page area-dashboard">
    <div class="detail-header">
      <button class="back-caret" type="button" @click="goBack" aria-label="Zurück">‹</button>
      <span class="page-title">Meine Schnell-Aufgaben</span>
    </div>

    <div class="qt-scroll">
      <p class="qt-intro">
        Wähle bestehende Haushaltsaufgaben aus, die als Schnell-Aufgaben auf deinem Dashboard
        erscheinen. Ein Tap dort erledigt genau diese Aufgabe — sie landet ganz normal im Verlauf.
      </p>

      <div v-if="loading" class="qt-loading">Laden…</div>

      <template v-else>
        <div v-if="selectableChores.length" class="card qt-card">
          <button
            v-for="chore in selectableChores"
            :key="chore.id"
            type="button"
            class="qt-row"
            :class="{ 'qt-row--on': isFavorite(chore.id) }"
            @click="onToggle(chore)"
          >
            <span class="qt-emoji">{{ tileEmoji(chore) }}</span>
            <span class="qt-text">
              <span class="qt-name">{{ chore.name }}</span>
              <span class="qt-sub">{{ subline(chore) }}</span>
            </span>
            <span class="qt-star" :class="{ 'qt-star--on': isFavorite(chore.id) }">
              {{ isFavorite(chore.id) ? '★' : '☆' }}
            </span>
          </button>
        </div>

        <div v-else class="qt-empty">
          Noch keine Aufgaben da. Lege sie zuerst im Haushalt-Tab an.
        </div>

        <p class="qt-count">{{ favCount }} ausgewählt</p>
        <button class="text-link" type="button" @click="router.push('/haushalt')">
          Aufgaben im Haushalt verwalten ›
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.qt-page {
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

.qt-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px var(--screen-pad) 32px;
}

.qt-intro {
  margin: 4px 2px 16px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-secondary);
}

.qt-loading {
  padding: 30px 0;
  text-align: center;
  color: var(--text-faint);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.qt-card {
  padding: 4px 14px;
}

.qt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-body);
}

.qt-row + .qt-row {
  border-top: 1px solid var(--border-softer);
}

.qt-emoji {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: var(--surface-deep);
}

.qt-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.qt-name {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qt-sub {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}

.qt-star {
  flex-shrink: 0;
  font-size: 22px;
  line-height: 1;
  color: var(--text-faint);
  transition: color 0.15s var(--ease-standard), transform 0.12s var(--ease-overshoot);
}

.qt-star--on {
  color: var(--accent);
  transform: scale(1.1);
}

.qt-empty {
  padding: 24px 4px;
  text-align: center;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-meta);
}

.qt-count {
  margin: 16px 2px 0;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--text-secondary);
}

.text-link {
  display: block;
  margin-top: 10px;
  padding: 0 2px;
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
}
</style>
