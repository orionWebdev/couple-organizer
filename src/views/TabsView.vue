<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useCouple } from '@/composables/useCouple'
import { useFabState } from '@/composables/useFab'
import { useOnline } from '@/composables/useOnline'
import NavIcon from '@/components/ui/NavIcon.vue'
import Toast from '@/components/ui/Toast.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import InviteCodeBox from '@/components/couple/InviteCodeBox.vue'
import PaywallSheet from '@/components/premium/PaywallSheet.vue'
import AiThinkingHost from '@/components/ai/AiThinkingHost.vue'
import AiHubButton from '@/components/ai/AiHubButton.vue'
import AiHubModal from '@/components/ai/AiHubModal.vue'

// useCouple ist ein Modul-Singleton und startet seinen Listener selbst, sobald
// user.coupleId gesetzt ist — hier ist nichts mehr anzustoßen.
const { couple } = useCouple()

const route = useRoute()
const router = useRouter()

// Dezente Offline-Anzeige (Sync selbst macht Firestore automatisch). Der Aufruf
// startet zugleich den "wieder online – synchronisiert"-Toast (Singleton).
const { isOnline } = useOnline()

// Show invite prompt while the partner has not joined yet
const partnerMissing = computed(() =>
  !!couple.value && couple.value.memberIds.length < 2
)
const showInvite = ref(false)

interface NavItem { id: string; label: string; icon: string; iconName: string; color: string; href: string }

// Bereichsfarbe + Icon je Tab. "Start" (Dashboard) sitzt bewusst mittig — der
// Heimat-/Fokus-Slot in der Mitte. Finanz-Coach ist ein Tab innerhalb von
// Finanzen. Die id ist zugleich das Routen-Segment. Die Array-Reihenfolge ist
// zugleich die Anzeigereihenfolge (die Nav ist index-unabhängig, jedes Item
// trägt seine eigene Bubble).
const NAV_ITEMS: readonly NavItem[] = [
  // Drei Slots: Heute (was jetzt ansteht) · Wir (wie es uns geht) · Alltag (die
  // Maschinerie). „Heute" behält id/Route 'dashboard', „Wir" behält 'planung' —
  // nur Label/Icon änderten sich, das erspart Route-Churn und hält persistierte
  // Deeplinks gültig.
  { id: 'dashboard', label: 'Heute', icon: '🏠', iconName: 'start', color: 'var(--dashboard)', href: '/dashboard' },
  { id: 'planung', label: 'Wir', icon: '💛', iconName: 'wir', color: 'var(--planung)', href: '/planung' },
  { id: 'alltag', label: 'Alltag', icon: '🗂️', iconName: 'alltag', color: 'var(--haushalt)', href: '/alltag' },
]

// Routen ohne eigenen Nav-Slot leihen sich den Slot ihres Bereichs. Die drei
// alten Bereichsrouten (haushalt/finanzen/einkaufen) leben nur noch als
// Redirects auf /alltag?tab=… — landet man doch einmal direkt auf ihnen (alter
// Deeplink, bevor der Redirect greift), soll die Bubble schon auf „Alltag"
// stehen. Die Einstellungen (Profil-Avatare im Header) haben keinen Bereich —
// dort bleibt die Bubble auf „Heute".
const SLOT_ALIASES: Record<string, string> = {
  haushalt: 'alltag',
  finanzen: 'alltag',
  einkaufen: 'alltag',
}

const activeId = computed(() => {
  const seg = route.path.split('/')[1] || 'dashboard'
  const id = SLOT_ALIASES[seg] ?? seg
  return NAV_ITEMS.find(i => i.id === id)?.id ?? 'dashboard'
})

// ── Globaler FAB ─────────────────────────────────────────────
// Ein Exemplar für die ganze App. Die aktive View meldet ihre Add-Aktion über
// useFab an; der FAB färbt sich im Ton des aktiven Bereichs (Farbe aus NAV_ITEMS,
// da der Shell außerhalb der area-*-Klasse liegt und --accent sonst der Default
// wäre).
const { action: fabAction } = useFabState()
const activeColor = computed(
  () => NAV_ITEMS.find(i => i.id === activeId.value)?.color ?? 'var(--accent)'
)

// Navigationslogik unverändert: gleiche Items, gleiche Routen. Die frühere
// index/prozentbasierte Positionsmathematik (slotCenterPercent, Gleit-Bubble,
// Droplets, Collar) entfällt — im Contract trägt jedes Item seine eigene Bubble,
// die beim Aktivieren erscheint, statt einer einzigen wandernden.
function selectNav(id: string) {
  const item = NAV_ITEMS.find(i => i.id === id)
  if (item) router.push(item.href)
}

// Klick-Feedback (Animation 2): Feder-Hüpfer aufs Item. Reflow erzwingt den
// Neustart der Keyframe-Animation, animationend räumt die Klasse wieder ab.
// Ändert die Navigationslogik nicht — selectNav läuft unverändert weiter.
//
// is-tapped kommt bewusst auf den .mnav__icon-Span, NICHT aufs .mnav__item:
// der Button trägt eine :class-Bindung (is-active), und beim Navigieren patcht
// Vue dessen Klasse neu und würde ein manuell gesetztes is-tapped sofort wieder
// entfernen (Animation gekillt). Der Icon-Span hat nur eine statische Klasse,
// die Vue bei Updates nicht anfasst — dort überlebt is-tapped den Re-Render.
function onTabClick(e: MouseEvent, id: string) {
  const icon = (e.currentTarget as HTMLElement).querySelector('.mnav__icon') as HTMLElement | null
  if (icon) {
    icon.classList.remove('is-tapped')
    void icon.offsetWidth // Reflow → Animation startet auch beim erneuten Tippen neu
    icon.classList.add('is-tapped')
    icon.addEventListener('animationend', () => icon.classList.remove('is-tapped'), { once: true })
  }
  selectNav(id)
}
</script>

<template>
  <div class="tabs-shell">
    <Transition name="offline-drop">
      <div v-if="!isOnline" class="offline-pill" role="status">
        <span class="offline-pill__dot" />
        <span>Offline – Änderungen werden gespeichert</span>
      </div>
    </Transition>

    <button
      v-if="partnerMissing"
      class="invite-banner"
      @click="showInvite = true"
    >
      <span class="invite-banner__text">Warte auf deine Person — Einladungscode zeigen</span>
      <span class="invite-banner__arrow">›</span>
    </button>

    <div class="tabs-content">
      <RouterView />
    </div>

    <BottomSheet :isOpen="showInvite" title="Person einladen" @close="showInvite = false">
      <InviteCodeBox v-if="couple" :code="couple.inviteCode" />
    </BottomSheet>

    <!-- Einmal für die ganze App: jede Composable/View öffnet sie über
         showPaywall(feature), ohne sie durchreichen zu müssen. -->
    <PaywallSheet />

    <!-- Einmal für die ganze App: der Vollbild-Bloom als „Fertig"-Flourish.
         Der Denk-Zustand selbst lebt in-context (Sheet-Glow / Ziel-Karte). -->
    <AiThinkingHost />

    <!-- Der EINE KI-Einstieg der App: dauerhafter Button rechts, zentraler Hub.
         Der frühere verstreute AiButton/AiTriggerBadge ist eingesammelt. -->
    <AiHubButton />
    <AiHubModal />

    <nav class="mnav">
      <button
        v-for="item in NAV_ITEMS"
        :key="item.id"
        class="mnav__item"
        :class="{ 'is-active': activeId === item.id }"
        :style="{ '--nav-accent': item.color }"
        @click="onTabClick($event, item.id)"
      >
        <span class="mnav__bubble" />
        <span class="mnav__icon"><NavIcon :name="item.iconName" /></span>
        <span class="mnav__label">{{ item.label }}</span>
      </button>
    </nav>

    <Transition name="fab-pop">
      <button
        v-if="fabAction"
        class="fab"
        type="button"
        :aria-label="fabAction.label"
        :style="{ '--accent': activeColor }"
        @click="fabAction.handler()"
      >＋</button>
    </Transition>

    <Toast />
  </div>
</template>

<style scoped>
.tabs-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.tabs-content {
  flex: 1;
  padding-bottom: calc(128px + var(--safe-bottom));
  overflow-y: auto;
}

/* Dezente Offline-Pille, oben mittig schwebend. Klassenname bewusst mit
   Komponenten-Präfix (kein bare Tailwind-Utility wie .pill/.badge). */
.offline-pill {
  position: fixed;
  top: calc(var(--safe-top) + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 28px);
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  box-shadow: var(--shadow-float);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.offline-pill__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted, #b0a89c);
}

.offline-drop-enter-active,
.offline-drop-leave-active {
  transition: transform 0.3s var(--ease-overshoot), opacity 0.2s var(--ease-standard);
}
.offline-drop-enter-from,
.offline-drop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-16px);
}

.invite-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: calc(var(--safe-top) + 12px) var(--screen-pad) 12px;
  background: var(--accent-tint);
  border: none;
  border-bottom: 1px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.invite-banner__arrow {
  font-size: 18px;
  line-height: 1;
}

/* ── Bottom-Nav: schwebende Pille mit überstehender Bubble ──────────
   Contract aus reference/design_handoff_modern_ui/navigation.css. Pro Item
   eine eigene Bubble im Bereichston (--nav-accent), die beim Aktivieren
   erscheint; das eigene Icon steigt in sie hinauf. Der frühere Gleit-/
   Droplet-/Collar-Mechanismus ist ersetzt. prefers-reduced-motion greift über
   die globale Base-Regel in app.css (Transition-Dauer → 0.01ms). */
.mnav {
  position: fixed;
  /* Mit dem KI-Hub sitzt die 3er-Leiste schmal LINKS; rechts daneben der
     dauerhafte KI-Button (AiHubButton) auf gleicher Höhe. Das nutzt den durch
     nur drei Tabs frei gewordenen Platz und löst zugleich die alte
     FAB/Bubble-Kollision — Nav und KI teilen sich die Fußzeile nebeneinander.
     Der Assistent-Button ist eine breite Pille (140) — die Formel reserviert
     genau diesen Platz + 8px Luft; auf schmalen Screens schrumpft die Nav mit.
     Beim Ändern der Button-Breite hier UND in AiHubButton anpassen. */
  left: 14px;
  width: min(275px, calc(100% - 14px - 140px - 24px));
  bottom: calc(20px + var(--safe-bottom));
  height: 66px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 26px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  box-shadow: var(--shadow-float);
  z-index: 100;
}

.mnav__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 800;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s var(--ease-standard);
}

/* Beschriftet wird nur der aktive Slot — fünf Labels nebeneinander machen die
   Leiste unruhig, und wohin man gerade getippt hat, sagt ohnehin schon die
   Bubble. Bewusst nur `opacity`: das Label bleibt im Layout stehen (die
   Icon-Reihe springt beim Wechsel also nicht) und bleibt im
   Accessibility-Baum, sodass Screenreader weiterhin alle fünf Ziele benennen —
   `display:none` oder `visibility:hidden` würden beides kaputt machen. */
.mnav__label {
  opacity: 0;
  transition: opacity 0.25s var(--ease-standard);
}

.mnav__item.is-active .mnav__label {
  opacity: 1;
}

.mnav__icon {
  transition: transform 0.35s var(--ease-overshoot);
}

.mnav__icon :deep(svg) {
  width: 27px;
  height: 27px;
  display: block;
}

/* Outline (.lo, inaktiv) ↔ gefüllte Silhouette (.fo, aktiv) per Opacity-
   Crossfade. :deep(), weil .lo/.fo im NavIcon-Kind liegen — scoped Selektoren
   griffen dort sonst nicht. */
.mnav__icon :deep(.fo) {
  opacity: 0;
  fill: currentColor;
  stroke: none;
  transition: opacity 0.3s var(--ease-standard);
}

.mnav__icon :deep(.lo) {
  opacity: 1;
  transition: opacity 0.3s var(--ease-standard);
}

.mnav__item.is-active .mnav__icon :deep(.fo) {
  opacity: 1;
  fill: #fff;
}

.mnav__item.is-active .mnav__icon :deep(.lo) {
  opacity: 0;
}

/* Animation 1: aktiv → Bereichsfarbe, Icon steigt in die überstehende Bubble.
   Spec nennt -34px; in unserem Layout liegt die Icon-Ruhemitte aber ~10px über
   der Bubblemitte, sodass -34 es zu weit oben platziert (gemessen). -24px
   zentriert es in der Bubble — die Bubble selbst bleibt bei -34. Der Bounce-
   Keyframe ist um dieselben 10px mitverschoben, damit es beim Tap nicht springt. */
.mnav__item.is-active {
  color: var(--nav-accent);
}

.mnav__item.is-active .mnav__icon {
  transform: translateY(-24px) scale(1.08);
}

/* Animation 2: Klick-Feedback — Feder-Hüpfer. is-tapped sitzt auf dem
   .mnav__icon-Span (nicht am Button), damit Vues Re-Render der Button-Klasse
   die Animation nicht abwürgt (siehe onTabClick). Amplituden aus der Spec,
   Basis auf -24px verschoben (passend zur aktiven Ruhelage, siehe oben). */
.mnav__icon.is-tapped {
  animation: mnav-tap 0.5s var(--ease-overshoot);
}

@keyframes mnav-tap {
  0%   { transform: translateY(-24px) scale(1.08); }
  30%  { transform: translateY(-30px) scale(0.82); }
  62%  { transform: translateY(-21px) scale(1.16); }
  100% { transform: translateY(-24px) scale(1.08); }
}

.mnav__bubble {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--nav-accent);
  opacity: 0;
  transform: translateX(-50%) scale(0.4);
  /* Der surface-farbene Ring ersetzt den früheren Collar-Halo (theme-aware). */
  box-shadow: 0 0 0 6px var(--surface),
              0 10px 18px color-mix(in srgb, var(--nav-accent) 45%, transparent);
  transition: opacity 0.4s var(--ease-overshoot), transform 0.4s var(--ease-overshoot);
  z-index: -1;
}

.mnav__item.is-active .mnav__bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(-34px) scale(1);
}

/* ── Globaler FAB (reference/design_handoff_modern_ui/fab.css) ──────
   Ein Exemplar, kontextabhängig über useFab. Farbe/Schatten aus dem hier
   inline gesetzten --accent (aktiver Bereichston). */
.fab {
  position: fixed;
  right: 20px;
  /* Seit dem KI-Hub sitzt rechts unten der dauerhafte KI-Button (66px hoch,
     bottom 20). Der kontextbezogene ＋-FAB rückt darüber, mit klarer Lücke —
     beide stapeln sich am rechten Rand, nichts überlappt. */
  bottom: calc(100px + var(--safe-bottom));
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 32px;
  line-height: 1;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--accent) 45%, transparent);
  z-index: 45;
  transition: transform 0.15s var(--ease-overshoot), background 0.2s var(--ease-standard);
}

.fab:active {
  transform: scale(0.9) rotate(90deg);
}

/* Ein-/Ausblenden beim Wechsel des Kontexts (Add-Aktion an/aus). */
.fab-pop-enter-active {
  transition: transform 0.3s var(--ease-overshoot), opacity 0.2s var(--ease-standard);
}
.fab-pop-leave-active {
  transition: transform 0.2s var(--ease-in), opacity 0.2s var(--ease-in);
}
.fab-pop-enter-from,
.fab-pop-leave-to {
  opacity: 0;
  transform: scale(0.4);
}
</style>
