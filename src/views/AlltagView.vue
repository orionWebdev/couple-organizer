<script setup lang="ts">
// Der dritte Tab: „Alltag" — die operative Maschinerie. Vier Segmente:
// Aufgaben · Küche · Geld · Kalender. Diese Shell trägt nur den gemeinsamen Kopf
// (Titel + Profil) und den 4er-Segmentumschalter; jedes Segment ist ein
// eigenständiger Pane mit eigenen Composable-Instanzen (Hausmuster) und meldet
// selbst seine FAB-Aktion an.
//
// Variante A der Bereichsfarbe: der Rahmen (.area-alltag) trägt EINEN festen Ton
// (Terrakotta), die einzelnen Panes setzen darüber ihre eigene .area-*-Klasse,
// sodass Budget türkis, Wochenplan rot-orange usw. bleiben.
//
// Öffnet ein Pane eine gestapelte Unteransicht (Verlauf, Rezepte, Analyse,
// Event-Detail, Einkaufsmodus), meldet er das über @subview — dann blendet die
// Shell Kopf + Segmentleiste aus, damit die Unteransicht sie überdeckt. Die
// Bottom-Nav (in TabsView) bleibt wie gewohnt stehen.
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { usePersistedRef } from '@/composables/usePersistedRef'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import AufgabenPane from '@/components/alltag/AufgabenPane.vue'
import KuechePane from '@/components/alltag/KuechePane.vue'
import GeldPane from '@/components/alltag/GeldPane.vue'
import KalenderPane from '@/components/alltag/KalenderPane.vue'

const route = useRoute()

type Tab = 'aufgaben' | 'kueche' | 'geld' | 'kalender'
const tabOptions = [
  { label: 'Aufgaben', value: 'aufgaben' },
  { label: 'Küche', value: 'kueche' },
  { label: 'Geld', value: 'geld' },
  { label: 'Kalender', value: 'kalender' },
]
const tabOrder: Tab[] = ['aufgaben', 'kueche', 'geld', 'kalender']

// Persistiert (überlebt den Android-Kaltstart); ein ?tab=-Deeplink gewinnt aber
// — so landen die Redirects von /haushalt|/finanzen|/einkaufen im richtigen
// Segment. Reaktiv auf Query-Wechsel, damit auch ein Sprung auf /alltag?tab=…
// bei bereits gemounteter View das Segment umstellt (z. B. Coach-Aktionen).
const tab = usePersistedRef<Tab>('alltag.tab', 'aufgaben')
watch(
  () => route.query.tab,
  (q) => { if (typeof q === 'string' && tabOrder.includes(q as Tab)) tab.value = q as Tab },
  { immediate: true }
)

// Meldet ein Pane eine offene Unteransicht, wird die Shell-Chrome ausgeblendet.
const chromeHidden = ref(false)

const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab, {
  enabled: () => !chromeHidden.value,
})

const activePane = computed(() => {
  switch (tab.value) {
    case 'kueche': return KuechePane
    case 'geld': return GeldPane
    case 'kalender': return KalenderPane
    default: return AufgabenPane
  }
})

// Beim Segmentwechsel eine etwaige Chrome-Ausblendung zurücksetzen (der neue
// Pane meldet seinen Zustand selbst per @subview neu).
watch(tab, () => { chromeHidden.value = false })
</script>

<template>
  <div class="alltag-page area-alltag">
    <template v-if="!chromeHidden">
      <div class="page-header">
        <h1 class="page-title">Alltag</h1>
        <ProfileButton :size="34" />
      </div>

      <div class="tab-bar-wrap">
        <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
      </div>
    </template>

    <div
      class="tab-area"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="onTouchEnd"
    >
      <!-- Der gekeyte <div> ist die EINE Transition-Wurzel. Die Panes selbst
           sind multi-root (v-if-Kette + Sheets bzw. eingebettete Views) — ohne
           diese Hülle könnte <Transition mode="out-in"> das „erst raus, dann
           rein" nicht sauber sequenzieren, der alte Pane bliebe kurz mit dem
           neuen zusammen gemountet und ihre Firestore-Listener überlappten
           (Küche/Geld teilen sich expenses) — der zweite liefert dann aus dem
           Cache nichts, bis ein Reload alles neu aufsetzt. -->
      <Transition name="tab-fade" mode="out-in">
        <div class="pane-host" :key="tab">
          <component
            :is="activePane"
            @subview="chromeHidden = $event"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.alltag-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 16px;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.tab-bar-wrap {
  padding: 0 var(--screen-pad);
  margin-bottom: 16px;
}

.tab-bar {
  display: flex;
  width: 100%;
  border-radius: 12px;
}

.tab-bar :deep(.seg-btn) {
  padding: 12px 0;
  font-size: 12.5px;
}

.tab-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  touch-action: pan-y;
}

.tab-area > * {
  flex: 1;
  min-height: 0;
}

/* Einzelne Transition-Wurzel; füllt den Tab-Bereich und lässt den Pane wachsen. */
.pane-host {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pane-host > * {
  flex: 1;
  min-height: 0;
}

/* Sanfter Übergang beim Segmentwechsel (gleiches Muster wie die anderen Tabs) */
.tab-fade-enter-active {
  transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard);
}
.tab-fade-leave-active {
  transition: opacity 140ms var(--ease-in), transform 140ms var(--ease-in);
}
.tab-fade-enter-from { opacity: 0; transform: translateY(6px); }
.tab-fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
