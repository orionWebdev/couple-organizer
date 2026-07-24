<script setup lang="ts">
// Alltag › Kalender. Der Belegungskalender (Monatsraster, Tagesdetail, Serien),
// aus dem früheren „Planung"-Segment des Wir-Tabs hierher gezogen. Reisen und
// Notizen sind KEIN Teil mehr — Reisen leben bei den Ideen in Wir, das Notizen-
// Widget ist entfernt. Der Kalender zeigt datierte Ideen/Reisen weiterhin als
// Marker, deshalb lädt der Pane sie mit (eigene Instanzen, Hausmuster).
import { ref, computed, onScopeDispose } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useBucketList } from '@/composables/useBucketList'
import { usePlanung } from '@/composables/usePlanung'
import { setFabAction } from '@/composables/useFab'
import BelegungKalender from '@/components/planung/BelegungKalender.vue'

const { user } = useAuth()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { items: ideen } = useBucketList(coupleId)
const { trips } = usePlanung(coupleId)

const kalenderRef = ref<InstanceType<typeof BelegungKalender> | null>(null)

// Eigene FAB-Aktion: neue Belegung anlegen.
setFabAction({ label: 'Belegung anlegen', handler: () => kalenderRef.value?.openNew() })
onScopeDispose(() => setFabAction(null))
</script>

<template>
  <div class="kalender rise-stagger">
    <BelegungKalender ref="kalenderRef" :ideas="ideen" :trips="trips" />
  </div>
</template>
