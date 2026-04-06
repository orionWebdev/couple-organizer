<script setup lang="ts">
import {
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonCheckbox,
  IonLabel
} from '@ionic/vue'
import type { ShoppingItem } from '@/types'

defineProps<{
  item: ShoppingItem
}>()

const emit = defineEmits<{
  toggle: [id: string, checked: boolean]
  delete: [id: string]
}>()
</script>

<template>
  <ion-item-sliding>
    <ion-item :class="{ 'opacity-60': item.checked }" class="rounded-xl mb-1">
      <ion-checkbox
        slot="start"
        :checked="item.checked"
        @ion-change="emit('toggle', item.id, !item.checked)"
        color="primary"
      />
      <ion-label :class="{ 'line-through text-slate-500': item.checked }">
        <h3 class="text-sm">{{ item.name }}</h3>
        <p class="text-xs text-slate-400">
          {{ item.category }}
          <span v-if="item.expenseId" class="text-green-400"> · als Ausgabe erfasst</span>
        </p>
      </ion-label>
    </ion-item>

    <ion-item-options side="end">
      <ion-item-option color="danger" @click="emit('delete', item.id)">
        Löschen
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
