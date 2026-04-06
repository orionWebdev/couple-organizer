<script setup lang="ts">
import {
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonCheckbox,
  IonLabel,
  IonSelect,
  IonSelectOption
} from '@ionic/vue'
import type { Todo, Couple } from '@/types'

defineProps<{
  todo: Todo
  couple: Couple | null
}>()

const emit = defineEmits<{
  toggle: [id: string, done: boolean]
  assign: [id: string, assignedTo: string | null]
  delete: [id: string]
}>()
</script>

<template>
  <ion-item-sliding>
    <ion-item :class="{ 'opacity-50': todo.done }" class="rounded-xl mb-1">
      <ion-checkbox
        slot="start"
        :checked="todo.done"
        @ion-change="emit('toggle', todo.id, !todo.done)"
        color="primary"
      />
      <ion-label :class="{ 'line-through text-slate-500': todo.done }">
        <h3 class="text-sm">{{ todo.title }}</h3>
        <p v-if="couple && todo.assignedTo" class="text-xs text-slate-400">
          {{ couple.memberNames[todo.assignedTo] || 'Nicht zugewiesen' }}
        </p>
      </ion-label>
      <ion-select
        v-if="couple"
        :value="todo.assignedTo || ''"
        interface="action-sheet"
        placeholder="Zuweisen"
        @ion-change="emit('assign', todo.id, ($event.detail.value as string) || null)"
        slot="end"
        class="text-xs max-w-30"
      >
        <ion-select-option value="">Nicht zugewiesen</ion-select-option>
        <ion-select-option
          v-for="(name, uid) in couple.memberNames"
          :key="uid"
          :value="uid"
        >
          {{ name }}
        </ion-select-option>
      </ion-select>
    </ion-item>

    <ion-item-options side="end">
      <ion-item-option color="danger" @click="emit('delete', todo.id)">
        Löschen
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>
