<script setup lang="ts">
import { computed } from 'vue'
import { IonInput, IonSelect, IonSelectOption } from '@ionic/vue'

export interface IngredientValue {
  name: string
  amount: string
  unit: string
}

const UNITS = ['g', 'kg', 'ml', 'l', 'Stk', 'TL', 'EL']

const props = defineProps<{
  modelValue: IngredientValue
  namePlaceholder?: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [v: IngredientValue]
}>()

const name = computed({
  get: () => props.modelValue.name,
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, name: val })
})

const amount = computed({
  get: () => props.modelValue.amount,
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, amount: String(val) })
})

const unit = computed({
  get: () => props.modelValue.unit || 'Stk',
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, unit: val })
})
</script>

<template>
  <div class="ing-group">
    <ion-input
      v-model="name"
      :placeholder="namePlaceholder ?? 'Zutat eingeben…'"
      fill="outline"
      :autofocus="autofocus"
      class="ing-name"
    />
    <div class="ing-row">
      <ion-input
        v-model="amount"
        type="number"
        inputmode="decimal"
        step="0.01"
        min="0"
        placeholder="Menge"
        fill="outline"
        class="ing-amount"
      />
      <ion-select
        v-model="unit"
        fill="outline"
        interface="action-sheet"
        class="ing-unit"
      >
        <ion-select-option v-for="u in UNITS" :key="u" :value="u">{{ u }}</ion-select-option>
      </ion-select>
    </div>
  </div>
</template>

<style scoped>
.ing-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ing-name {
  width: 100%;
}

.ing-row {
  display: flex;
  gap: 0.375rem;
}

.ing-amount {
  flex: 1;
  min-width: 0;
}

.ing-unit {
  flex: 1.2;
  min-width: 0;
}
</style>
