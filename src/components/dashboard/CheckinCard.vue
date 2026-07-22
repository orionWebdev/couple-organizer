<script setup lang="ts">
import { computed } from 'vue'
import type { CheckinEntry } from '@/types'
import { checkinAreaDef, CHECKIN_LEVEL_LABELS } from '@/utils/checkin'

// „Dein Check-in" auf dem Dashboard — der private Gegenpol zum (geteilten)
// Wochen-Check-in direkt darüber.
//
// Zeigt AUSSCHLIESSLICH die eigenen Einträge. Der Digest des Partners wird
// bewusst in keiner UI angezeigt — er existiert nur für den Coach-Snapshot;
// alles andere wäre eine Überwachungsanzeige und das Gegenteil des Features.
const props = defineProps<{
  entries: readonly CheckinEntry[]
  optedIn: boolean
}>()

defineEmits<{ open: []; remove: [id: string] }>()

const MAX_SHOWN = 3

const recent = computed(() => props.entries.slice(0, MAX_SHOWN))

function whenLabel(entry: CheckinEntry): string {
  const ms = entry.createdAt?.toMillis?.() ?? 0
  if (!ms) return 'gerade eben'
  const days = Math.floor((Date.now() - ms) / 86400000)
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  const weeks = Math.round(days / 7)
  return weeks === 1 ? 'vor einer Woche' : `vor ${weeks} Wochen`
}
</script>

<template>
  <div class="ci">
    <div class="sec">
      <span class="sec-lab">Dein Check-in</span>
      <span class="sec-priv">🔒 privat</span>
    </div>

    <div class="ci-card">
      <!-- Teaser, solange die Einwilligung fehlt -->
      <template v-if="!optedIn">
        <p class="ci-teaser">
          Was beschäftigt dich in eurem Alltag? Vertrau es der App an — dein
          Partner liest es nie, aber der Wochen-Check-in kann es behutsam und
          ohne Namen aufgreifen.
        </p>
        <button type="button" class="ci-cta" @click="$emit('open')">Check-in kennenlernen</button>
      </template>

      <template v-else>
        <button type="button" class="ci-ask" @click="$emit('open')">
          <span class="ci-ask-icon" aria-hidden="true">🪷</span>
          <span class="ci-ask-text">
            <b>Wie geht’s dir gerade?</b>
            <i>Nur für dich — fließt anonym in euren Wochenbericht ein.</i>
          </span>
        </button>

        <ul v-if="recent.length" class="ci-list">
          <li v-for="e in recent" :key="e.id" class="ci-row">
            <span class="ci-row-emoji" aria-hidden="true">{{ checkinAreaDef(e.area).emoji }}</span>
            <span class="ci-row-main">
              <b>{{ checkinAreaDef(e.area).label }}</b>
              <i>{{ CHECKIN_LEVEL_LABELS[e.level] }} · {{ whenLabel(e) }}</i>
            </span>
            <button
              type="button"
              class="ci-row-del"
              aria-label="Eintrag löschen"
              @click="$emit('remove', e.id)"
            >✕</button>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ci {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Abschnittskopf wie im übrigen Dashboard (.sec in DashboardView). */
.sec {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 2px 4px;
  margin-top: 6px;
}

.sec-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.sec-priv {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-faint);
}

.ci-card {
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 14px 16px;
}

.ci-teaser {
  margin: 0 0 12px;
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.ci-cta {
  padding: 9px 16px;
  border: 1.5px solid var(--border-softer);
  border-radius: 999px;
  background: var(--surface-deep);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}

.ci-ask {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 0;
  border: none;
  background: none;
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}

.ci-ask-icon {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  font-size: 20px;
  border-radius: 50%;
  background: var(--accent-tint);
}

.ci-ask-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ci-ask-text b {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text);
}

.ci-ask-text i {
  font-style: normal;
  font-size: 12px;
  color: var(--text-meta);
  line-height: 1.4;
}

.ci-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--border-softer);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ci-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ci-row-emoji {
  flex: none;
  font-size: 15px;
}

.ci-row-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.ci-row-main b {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.ci-row-main i {
  font-style: normal;
  font-size: 11.5px;
  color: var(--text-faint);
}

.ci-row-del {
  flex: none;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: var(--surface-deep);
  font-size: 11px;
  color: var(--text-meta);
  cursor: pointer;
}
</style>
