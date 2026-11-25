import { reactive } from 'vue'

export const toasts = reactive([])
let seq = 0

export function dismissToast(id) {
  const index = toasts.findIndex((toast) => toast.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

function push(type, title, message = '', duration = 4200) {
  const id = ++seq
  toasts.push({ id, type, title, message })
  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export function useToast() {
  return {
    success: (title, message) => push('success', title, message),
    error: (title, message) => push('error', title, message, 5200),
    info: (title, message) => push('info', title, message),
    warning: (title, message) => push('warning', title, message)
  }
}
