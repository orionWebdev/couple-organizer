<script lang="ts">
// Aktions-Auswahl für Multi-Aktion-Seiten (Küche: "Woche planen" / "Rezept
// vorschlagen"). Der Gradient lebt hier NUR im Icon-Akzent der Zeilen, nicht
// flächig — die flächige KI-Optik ist dem Denk-Zustand vorbehalten.
export interface AiActionItem {
  key: string
  icon: string
  title: string
  subtitle?: string
}
</script>

<script setup lang="ts">
import BottomSheet from '@/components/ui/BottomSheet.vue'

withDefaults(
  defineProps<{
    isOpen: boolean
    title?: string
    actions: AiActionItem[]
  }>(),
  { title: 'Was soll die KI tun?' },
)

const emit = defineEmits<{ close: []; select: [key: string] }>()
</script>

<template>
  <BottomSheet :isOpen="isOpen" :title="title" @close="emit('close')">
    <div class="ai-actions">
      <button
        v-for="a in actions"
        :key="a.key"
        type="button"
        class="ai-row"
        @click="emit('select', a.key)"
      >
        <span class="ai-row-ic">{{ a.icon }}</span>
        <span class="ai-row-txt">
          <b>{{ a.title }}</b>
          <i v-if="a.subtitle">{{ a.subtitle }}</i>
        </span>
        <span class="ai-row-chev" aria-hidden="true">›</span>
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.ai-actions {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ai-row {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 17px;
  background: var(--surface-deep);
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s ease;
}

.ai-row:active {
  transform: scale(0.98);
}

/* Gradient nur als Akzent auf dem Icon-Chip. */
.ai-row-ic {
  flex: none;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  font-size: 22px;
  background: var(--ai-gradient);
  background-size: 200% 200%;
  box-shadow: var(--ai-glow);
  animation: aiShift 6s ease-in-out infinite;
}

.ai-row-txt {
  flex: 1;
  min-width: 0;
}

.ai-row-txt b {
  display: block;
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 15.5px;
  color: var(--text);
}

.ai-row-txt i {
  display: block;
  font-style: normal;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-top: 1px;
}

.ai-row-chev {
  font-size: 24px;
  line-height: 1;
  color: var(--text-faint);
}
</style>
