<script setup lang="ts">
// Nav-Line-Icons (Redesign: Emoji → einheitliches Line-Icon-Set). Jedes Icon
// trägt beide Pfade: .lo (Outline, inaktiv) und .fo (gefüllte Silhouette,
// aktiv). Die Umschaltung macht die Nav-CSS in TabsView über
// .mnav__item.is-active (Opacity-Crossfade), nicht dieser Komponente — deshalb
// braucht sie keinen active-Prop. SVG-Pfade sind das verbindliche Design-Set.
defineProps<{ name: string }>()
</script>

<template>
  <svg
    v-if="name === 'start'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path class="lo" d="M3 10.4 12 3l9 7.4" />
    <path class="lo" d="M5.5 9.2V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.2" />
    <path class="fo" d="M12 3 3 10.4V20a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1v-9.6L12 3Z" />
  </svg>

  <svg
    v-else-if="name === 'haushalt'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path class="lo" d="M9 21V9.5a2.5 2.5 0 0 0-5 0V21" />
    <path class="lo" d="M6.5 3v4" />
    <path class="lo" d="M16 21v-6m0 0c2.2 0 3.5-1.6 3.5-4.5C19.5 6 18 3 16 3s-3.5 3-3.5 7.5c0 2.9 1.3 4.5 3.5 4.5Z" />
    <path class="fo" d="M4 21V9.5a2.5 2.5 0 0 1 5 0V21H4Zm2.5-18v4M16 21v-6c2.2 0 3.5-1.6 3.5-4.5C19.5 6 18 3 16 3s-3.5 3-3.5 7.5c0 2.9 1.3 4.5 3.5 4.5v6h-.001Z" />
  </svg>

  <svg
    v-else-if="name === 'planung'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect class="lo" x="3.5" y="5" width="17" height="16" rx="3" />
    <path class="lo" d="M3.5 9.5h17M8 3v4m8-4v4" />
    <path class="fo" d="M6.5 3.8a1 1 0 0 0-1 1V5a3 3 0 0 0-2 2.8V9.5h17V7.8a3 3 0 0 0-2-2.8v-.2a1 1 0 1 0-2 0V5H8.5v-.2a1 1 0 0 0-1-1Zm14 7.2h-17V18a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-7Z" />
  </svg>

  <svg
    v-else-if="name === 'finanzen'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect class="lo" x="2.5" y="6" width="19" height="13" rx="3" />
    <path class="lo" d="M2.5 10h19" />
    <circle class="lo" cx="17" cy="14.5" r="1.2" />
    <path class="fo" d="M5.5 6A3 3 0 0 0 2.5 9H21A2.99 2.99 0 0 0 18.5 6h-13Zm16 4.5h-19V16a3 3 0 0 0 3 3h13a3 3 0 0 0 3-3v-5.5ZM17 13.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
  </svg>

  <svg
    v-else-if="name === 'essen'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path class="lo" d="M6 3v7m-2.5-7v4.5A2.5 2.5 0 0 0 6 10m0 0v11M6 3v0" />
    <path class="lo" d="M8.5 3v4.5A2.5 2.5 0 0 1 6 10" />
    <path class="lo" d="M17.5 3c-1.7 0-3 2.2-3 5s1.3 4 3 4v9" />
    <path class="fo" d="M4.5 3a1 1 0 0 0-1 1v3.5A2.5 2.5 0 0 0 5 9.8V21a1 1 0 1 0 2 0V9.8a2.5 2.5 0 0 0 1.5-2.3V4a1 1 0 1 0-2 0v3.5a.5.5 0 0 1-1 0V4a1 1 0 0 0-1-1Zm13 0c-1.9 0-3.5 2.4-3.5 5.5 0 2.6 1.1 4.4 2.5 5.3V21a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1Z" />
  </svg>
</template>
