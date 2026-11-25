<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  tone: { type: String, default: 'primary' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])
const confirmButton = ref(null)

function close() {
  if (!props.loading) emit('cancel')
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      document.body.classList.add('no-scroll')
      await nextTick()
      confirmButton.value?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.classList.remove('no-scroll')
    }
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('no-scroll')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-overlay" @click.self="close">
        <div class="dialog" role="dialog" aria-modal="true" :aria-label="title">
          <span class="dialog-icon" :class="`tone-${tone}`">
            <AppIcon :name="tone === 'danger' ? 'alert-triangle' : 'info'" :size="22" />
          </span>
          <h2 class="dialog-title">{{ title }}</h2>
          <p v-if="message" class="dialog-message">{{ message }}</p>
          <div class="dialog-actions">
            <button type="button" class="btn" :disabled="loading" @click="close">
              {{ cancelText }}
            </button>
            <button
              ref="confirmButton"
              type="button"
              class="btn"
              :class="tone === 'danger' ? 'btn--danger' : 'btn--primary'"
              :disabled="loading"
              @click="emit('confirm')"
            >
              <span v-if="loading" class="spinner" aria-hidden="true" />
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
