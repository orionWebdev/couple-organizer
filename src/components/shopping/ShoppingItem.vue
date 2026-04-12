<script setup lang="ts">
import { ref } from 'vue'
import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonIcon
} from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import type { ShoppingItem } from '@/types'

defineProps<{
  item: ShoppingItem
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
}>()

const sliding = ref<InstanceType<typeof IonItemSliding> | null>(null)

async function handleRowClick(id: string, currentlyChecked: boolean) {
  // Close any sliding gesture so a mid-swipe tap doesn't also toggle.
  const el = sliding.value as any
  if (el?.getOpenAmount) {
    const open = await el.getOpenAmount()
    if (open !== 0) {
      await el.close()
      return
    }
  }
  emit('toggle', id, !currentlyChecked)
}
</script>

<template>
  <ion-item-sliding ref="sliding" class="shop-sliding">
    <ion-item
      lines="none"
      button
      :detail="false"
      class="shop-item"
      :class="{ 'shop-item--checked': item.checked }"
      @click="handleRowClick(item.id, item.checked)"
    >
      <div class="shop-row">
        <!-- Checkbox -->
        <span
          class="shop-check"
          :class="{ 'shop-check--checked': item.checked }"
          :aria-label="item.checked ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'"
        >
          <svg v-if="item.checked" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>

        <!-- Text -->
        <div class="shop-body">
          <div class="shop-name-row">
            <span class="shop-name">{{ item.name }}</span>
            <span v-if="item.amount" class="shop-amount">
              {{ Number.isInteger(item.amount) ? item.amount : Number(item.amount.toFixed(2)) }}{{ item.unit ? '\u00a0' + item.unit : '' }}
            </span>
          </div>
          <div class="shop-meta">
            <span class="shop-category">{{ item.category }}</span>
            <span v-if="item.source === 'mealPlan'" class="badge badge--meal">Wochenplan</span>
            <span v-if="item.expenseId" class="badge badge--expense">Ausgabe ✓</span>
          </div>
        </div>
      </div>
    </ion-item>

    <ion-item-options side="end">
      <ion-item-option color="danger" expandable @click="emit('delete', item.id)">
        <ion-icon :icon="trashOutline" slot="icon-only" />
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<style scoped>
.shop-sliding {
  margin: 0;
  border-radius: 1rem;
  overflow: hidden;
}

.shop-item {
  --background: rgba(30, 41, 59, 0.92);
  --color: var(--app-text);
  --padding-start: 0;
  --padding-end: 0;
  --inner-padding-end: 0;
  --min-height: 3.8rem;
  --ripple-color: rgba(var(--app-primary-rgb), 0.3);
  margin: 0;
  transition: opacity 0.18s ease;
}

.shop-item::part(native) {
  border: 1px solid rgba(71, 85, 105, 0.72);
  border-radius: 1rem;
  padding: 0.75rem 0.875rem;
  transition: transform 0.12s ease, background 0.18s ease;
}

.shop-item:active::part(native) {
  transform: scale(0.985);
  background: rgba(30, 41, 59, 1);
}

.shop-item--checked {
  opacity: 0.52;
}

.shop-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

/* ── Checkbox (non-interactive visual; row handles toggle) ─── */
.shop-check {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(71, 85, 105, 0.88);
  background: transparent;
  color: #fff;
  transition: background 0.16s, border-color 0.16s;
}

.shop-check--checked {
  background: var(--app-success);
  border-color: var(--app-success);
}

.shop-check svg {
  width: 1rem;
  height: 1rem;
}

/* ── Body ──────────────────────────────────────────────────── */
.shop-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.shop-name-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.shop-name {
  font-size: 1.1875rem;
  font-weight: 500;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.shop-amount {
  font-size: 1rem;
  font-weight: 600;
  color: var(--app-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.shop-item--checked .shop-name {
  text-decoration: line-through;
  color: var(--app-text-muted);
}

.shop-item--checked .shop-amount {
  color: var(--app-text-muted);
}

.shop-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.shop-category {
  font-size: 0.97rem;
  color: var(--app-text-muted);
}

/* ── Badges ────────────────────────────────────────────────── */
.badge {
  font-size: 0.93rem;
  font-weight: 600;
  border-radius: 9999px;
  padding: 0.1rem 0.45rem;
}

.badge--meal {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.14);
}

.badge--expense {
  color: #6ee7b7;
  background: rgba(34, 197, 94, 0.12);
}

ion-item-option {
  font-weight: 600;
}
</style>
