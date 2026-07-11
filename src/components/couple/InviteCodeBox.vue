<script setup lang="ts">
import { showToast } from '@/composables/useToast'

const props = defineProps<{
  code: string
}>()

const canShare = typeof navigator !== 'undefined' && !!navigator.share

function shareText() {
  return `Sei bei Together dabei! Lade die App und gib diesen Einladungscode ein: ${props.code}`
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code)
    showToast('Code kopiert')
  } catch {
    showToast('Kopieren nicht möglich')
  }
}

async function share() {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Together', text: shareText() })
    } catch {
      // user cancelled – ignore
    }
  } else {
    await copyCode()
  }
}
</script>

<template>
  <div class="invite-box">
    <p class="invite-label">Einladungscode</p>
    <div class="invite-code" @click="copyCode">{{ code }}</div>
    <div class="invite-actions">
      <button class="invite-btn invite-btn--secondary" @click="copyCode">Code kopieren</button>
      <button v-if="canShare" class="btn-primary invite-btn" @click="share">Teilen</button>
    </div>
    <p class="invite-hint">
      Teile diesen Code mit deiner Person. Sie wählt beim Einrichten
      „Mit Code beitreten“ und gibt ihn ein.
    </p>
  </div>
</template>

<style scoped>
.invite-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.invite-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin: 0;
  text-align: center;
}

.invite-code {
  font-family: var(--font-headline);
  font-weight: 700;
  font-size: 32px;
  letter-spacing: 0.2em;
  text-align: center;
  color: var(--accent);
  background: var(--surface-deep);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-card);
  padding: 18px 12px;
  cursor: pointer;
  user-select: all;
}

.invite-actions {
  display: flex;
  gap: 10px;
}

.invite-btn {
  flex: 1;
}

.invite-btn--secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  background: var(--surface-deep);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 14px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
}

.invite-btn--secondary:active {
  background: var(--surface);
}

.invite-hint {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  text-align: center;
}
</style>
