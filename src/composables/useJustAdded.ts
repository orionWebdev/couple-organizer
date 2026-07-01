import { ref, watch } from 'vue'

/**
 * Tracks which list entries were *just* added so a caller can apply the
 * "Slide + Highlight" fade (Animations-Spec §5). Entries present on the first
 * non-empty render are treated as pre-existing and never highlighted — only
 * genuinely new keys light up, and each clears itself after `duration` ms.
 */
export function useJustAdded<T>(
  getList: () => readonly T[],
  keyFn: (item: T) => string,
  duration = 700,
) {
  const justAdded = ref<Set<string>>(new Set())
  let seen: Set<string> | null = null
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  watch(
    getList,
    (list) => {
      const keys = list.map(keyFn)

      // Prime on the first non-empty snapshot: everything already there
      // counts as existing, so an initial data load doesn't flash.
      if (seen === null) {
        if (keys.length === 0) return
        seen = new Set(keys)
        return
      }

      for (const key of keys) {
        if (seen.has(key)) continue
        const next = new Set(justAdded.value)
        next.add(key)
        justAdded.value = next

        const existing = timers.get(key)
        if (existing) clearTimeout(existing)
        timers.set(
          key,
          setTimeout(() => {
            const after = new Set(justAdded.value)
            after.delete(key)
            justAdded.value = after
            timers.delete(key)
          }, duration),
        )
      }

      seen = new Set(keys)
    },
    { immediate: true },
  )

  return { justAdded }
}
