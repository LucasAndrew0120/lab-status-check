<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  variant: { type: String, default: 'loading' }, // loading | empty | error
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  icon: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})

const defaultTitle = computed(() => {
  if (props.variant === 'error') return '加载失败'
  if (props.variant === 'empty') return '暂无数据'
  return '正在加载'
})

const iconName = computed(() => {
  if (props.icon) return props.icon
  if (props.variant === 'error') return 'alert-circle'
  if (props.variant === 'empty') return 'inbox'
  return 'activity'
})
</script>

<template>
  <div
    class="state-panel"
    :class="[`state-panel--${variant}`, { 'state-panel--compact': compact }]"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <span v-if="variant === 'loading'" class="spinner state-spinner" aria-hidden="true" />
    <span v-else class="state-icon" :class="{ 'state-icon--danger': variant === 'error' }">
      <AppIcon :name="iconName" :size="24" />
    </span>
    <p class="state-title">{{ title || defaultTitle }}</p>
    <p v-if="message" class="state-message">{{ message }}</p>
    <div v-if="$slots.default" class="state-actions">
      <slot />
    </div>
  </div>
</template>
