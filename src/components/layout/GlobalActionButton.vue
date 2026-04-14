<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  addOutline,
  checkboxOutline,
  cartOutline,
  walletOutline,
  restaurantOutline
} from 'ionicons/icons'
import { useActionHub } from '@/composables/useActionHub'

const {
  triggerAddTask,
  triggerAddShopping,
  triggerAddExpense,
  triggerAddRecipe
} = useActionHub()

const open = ref(false)

type ActionId = 'task' | 'shopping' | 'expense' | 'recipe'

const actions: { id: ActionId; label: string; icon: string }[] = [
  { id: 'task',     label: 'Aufgabe', icon: checkboxOutline },
  { id: 'shopping', label: 'Einkauf', icon: cartOutline },
  { id: 'expense',  label: 'Ausgabe', icon: walletOutline },
  { id: 'recipe',   label: 'Rezept',  icon: restaurantOutline }
]

const hapticTap = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.(8)
  }
}

function toggle() {
  hapticTap()
  open.value = !open.value
}

function close() {
  open.value = false
}

async function runAction(id: ActionId) {
  hapticTap()
  close()
  switch (id) {
    case 'task':     await triggerAddTask(); break
    case 'shopping': await triggerAddShopping(); break
    case 'expense':  await triggerAddExpense(); break
    case 'recipe':   await triggerAddRecipe(); break
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(open, (o) => {
  if (o) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const items = computed(() => actions)
</script>

<template>
  <!-- Hill-shaped raised button -->
  <button
    type="button"
    class="hill-btn"
    :class="{ 'hill-open': open }"
    :aria-expanded="open"
    aria-label="Schnellaktionen"
    @click.stop="toggle"
  >
    <span class="hill-inner">
      <ion-icon :icon="addOutline" class="hill-icon" />
    </span>
  </button>

  <!-- Overlay menu -->
  <Teleport to="body">
    <Transition name="hub-backdrop">
      <div
        v-if="open"
        class="hub-backdrop"
        @click="close"
      />
    </Transition>

    <Transition name="hub-menu">
      <div v-if="open" class="hub-menu" role="menu">
        <button
          v-for="(item, i) in items"
          :key="item.id"
          type="button"
          class="hub-item"
          role="menuitem"
          :style="{ '--i': i }"
          @click="runAction(item.id)"
        >
          <span class="hub-item-icon">
            <ion-icon :icon="item.icon" />
          </span>
          <span class="hub-item-label">{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Hill-shaped button ─────────────────────────────────────────── */
.hill-btn {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 68px;
  height: 58px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  /* lift above nav bar into a "hill" */
  transform: translateY(-22px);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hill-btn:active {
  transform: translateY(-22px) scale(0.94);
}

.hill-btn.hill-open {
  transform: translateY(-22px) scale(1.05);
}

.hill-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50% 50% 44% 44% / 54% 54% 46% 46%;
  background: radial-gradient(
    circle at 32% 28%,
    #60a5fa 0%,
    #3b82f6 46%,
    #2563eb 100%
  );
  box-shadow:
    0 10px 22px rgba(59, 130, 246, 0.45),
    0 2px 6px rgba(59, 130, 246, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: box-shadow 0.25s ease, border-radius 0.3s ease;
}

.hill-btn.hill-open .hill-inner {
  border-radius: 50%;
  box-shadow:
    0 14px 28px rgba(59, 130, 246, 0.55),
    0 3px 8px rgba(59, 130, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.hill-icon {
  font-size: 30px;
  color: #fff;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.hill-btn.hill-open .hill-icon {
  transform: rotate(45deg);
}

/* ── Backdrop ───────────────────────────────────────────────────── */
.hub-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(7, 11, 23, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 40;
}

.hub-backdrop-enter-active,
.hub-backdrop-leave-active {
  transition: opacity 0.22s ease;
}
.hub-backdrop-enter-from,
.hub-backdrop-leave-to {
  opacity: 0;
}

/* ── Menu ───────────────────────────────────────────────────────── */
.hub-menu {
  position: fixed;
  left: 50%;
  /* sits above the nav + hill */
  bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(71, 85, 105, 0.6);
  border-radius: 22px;
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.45),
    0 2px 10px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  z-index: 41;
  min-width: 300px;
}

.hub-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 16px;
  color: var(--app-text);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;

  /* staggered slide-in */
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  animation: hub-item-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: calc(var(--i) * 45ms + 60ms);
}

.hub-item:active {
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.55);
}

.hub-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.2);
  color: #ffffff;
  font-size: 20px;
}

.hub-item-icon ion-icon {
  font-size: 20px;
  color: #ffffff;
}

.hub-item-label {
  flex: 1;
  text-align: left;
}

@keyframes hub-item-in {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.hub-menu-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hub-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.hub-menu-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.96);
}
.hub-menu-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .hill-btn,
  .hill-inner,
  .hill-icon,
  .hub-item,
  .hub-menu-enter-active,
  .hub-menu-leave-active,
  .hub-backdrop-enter-active,
  .hub-backdrop-leave-active {
    transition: none !important;
    animation: none !important;
  }
}
</style>
