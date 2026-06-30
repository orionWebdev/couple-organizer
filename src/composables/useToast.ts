import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function showToast(msg: string) {
  if (timer) clearTimeout(timer)
  message.value = msg
  visible.value = true
  timer = setTimeout(() => {
    visible.value = false
  }, 2200)
}

export function useToastState() {
  return { message, visible }
}
