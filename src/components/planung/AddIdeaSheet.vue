<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Couple, IdeaCategory } from '@/types'
import { resolveIdeaCategories } from '@/utils/ideen'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const props = defineProps<{
  isOpen: boolean
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { category: IdeaCategory; name: string; suggestedBy: string }): void
}>()

const categories = computed(() => resolveIdeaCategories(props.couple))

const category = ref<IdeaCategory>('')
const name = ref('')
const suggestedBy = ref('')

// Jedes Öffnen startet leer — sonst stünde die letzte Idee noch im Feld.
watch(() => props.isOpen, (open) => {
  if (!open) return
  category.value = categories.value[0]?.id ?? ''
  name.value = ''
  suggestedBy.value = props.currentUserId
})

function personColor(uid: string): string {
  return props.couple?.memberIds.indexOf(uid) === 0 ? 'var(--chris)' : 'var(--sarah)'
}

function submit() {
  if (!name.value.trim()) return
  emit('submit', {
    category: category.value,
    name: name.value.trim(),
    suggestedBy: suggestedBy.value || props.currentUserId,
  })
}
</script>

<template>
  <BottomSheet :isOpen="isOpen" title="Neue Idee" @close="emit('close')">
    <!-- Das Sheet teleportiert nach <body> und liegt damit außerhalb von
         .area-planung — ohne diese Klasse fiele --accent auf Terrakotta zurück. -->
    <div class="area-planung">
      <p class="sheet-sub">Was wollt ihr mal machen?</p>

      <div class="section-label label">Kategorie</div>
      <div class="cats">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="cat"
          :class="{ 'cat--on': category === cat.id }"
          @click="category = cat.id"
        >
          <span class="cat-emoji">{{ cat.emoji }}</span>
          {{ cat.label }}
        </button>
      </div>

      <div class="section-label label">Was?</div>
      <input
        v-model="name"
        class="app-field field"
        placeholder="z. B. neuer Tarantino-Film"
        @keyup.enter="submit"
      />

      <div class="section-label label">Von wem?</div>
      <div class="segment">
        <button
          v-for="uid in couple?.memberIds ?? []"
          :key="uid"
          type="button"
          class="segment-btn"
          :style="{
            background: suggestedBy === uid ? personColor(uid) : 'transparent',
            color: suggestedBy === uid ? '#fff' : 'var(--text-secondary)',
          }"
          @click="suggestedBy = uid"
        >{{ couple?.memberNames[uid] ?? '?' }}</button>
      </div>

      <button class="btn-primary" :disabled="!name.trim()" @click="submit">Idee merken</button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sheet-sub {
  margin: -4px 0 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.label {
  margin-bottom: 7px;
}

/* Grid statt fester 3er-Reihe: die Kategorien sind in den Einstellungen frei
   erweiterbar. */
.cats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}

.cat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 4px;
  border: 1px solid var(--border-soft);
  border-radius: 11px;
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
  cursor: pointer;
}

.cat--on {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--accent);
}

.cat-emoji {
  font-size: 18px;
}

.field {
  margin-bottom: 14px;
}

.segment {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  background: var(--surface-deep);
  border-radius: 12px;
}

.segment-btn {
  flex: 1;
  padding: 9px 6px;
  border: none;
  border-radius: 9px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-standard);
}
</style>
