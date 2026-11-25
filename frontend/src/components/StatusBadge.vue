<script setup>
import { computed } from 'vue'
import { statusMeta } from '../utils/status'

const props = defineProps({
  type: { type: String, default: 'device' },
  value: { type: [String, null], default: null }
})

const meta = computed(() => statusMeta(props.type, props.value))
</script>

<template>
  <span class="status-badge" :class="`tone-${meta.tone}`">
    <span class="status-dot" aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>
