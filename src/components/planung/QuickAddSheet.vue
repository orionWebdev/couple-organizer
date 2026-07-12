<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'

// Ein Sheet für die beiden knappen Eingaben des Planung-Tabs: Reise (Titel +
// freies "wann") und Notiz (nur Text). `extraPlaceholder` schaltet das zweite
// Feld zu.
const props = defineProps<{
  isOpen: boolean
  title: string
  placeholder: string
  extraLabel?: string
  extraPlaceholder?: string
  submitLabel?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { text: string; extra: string }): void
}>()

const text = ref('')
const extra = ref('')

watch(() => props.isOpen, (open) => {
  if (!open) return
  text.value = ''
  extra.value = ''
})

function submit() {
  if (!text.value.trim()) return
  emit('submit', { text: text.value.trim(), extra: extra.value.trim() })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="title" @close="emit('close')">
    <!-- Teleport nach <body>: ohne .area-planung fiele --accent auf den
         Default (Terrakotta) zurück. -->
    <div class="area-planung">
      <input
        v-model="text"
        class="app-field field"
        :placeholder="placeholder"
        @keyup.enter="submit"
      />

      <template v-if="extraPlaceholder">
        <div class="section-label label">{{ extraLabel }}</div>
        <input
          v-model="extra"
          class="app-field field"
          :placeholder="extraPlaceholder"
          @keyup.enter="submit"
        />
      </template>

      <button class="btn-primary" :disabled="!text.trim()" @click="submit">
        {{ submitLabel ?? 'Hinzufügen' }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.field {
  margin-bottom: 16px;
}

.label {
  margin-bottom: 7px;
}
</style>
