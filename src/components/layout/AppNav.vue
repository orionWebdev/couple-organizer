<script setup lang="ts">
defineProps<{
  activeTab: string
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: string]
}>()

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'todos', label: 'Aufgaben', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'recipes', label: 'Rezepte', icon: 'M12 6.253v13m0-13C10.832 5.483 9.246 5 7.5 5 4.462 5 2 6.567 2 8.5v10C2 16.567 4.462 15 7.5 15c1.746 0 3.332.483 4.5 1.253m0-10.999C13.168 5.483 14.754 5 16.5 5c3.038 0 5.5 1.567 5.5 3.5v10c0-1.933-2.462-3.5-5.5-3.5-1.746 0-3.332.483-4.5 1.253' },
  { id: 'mealPlan', label: 'Wochenplan', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'shopping', label: 'Einkäufe', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  { id: 'expenses', label: 'Finanzen', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
]
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-10">
    <div class="max-w-lg mx-auto flex overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="emit('update:activeTab', tab.id)"
        class="min-w-[72px] flex-1 flex flex-col items-center py-3 transition-colors"
        :class="activeTab === tab.id ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
        </svg>
        <span class="text-xs mt-1 font-medium">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
