<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: null },
  icon: { type: String, default: 'activity' },
  tone: { type: String, default: 'blue' },
  hint: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})
</script>

<template>
  <article class="stat-card" :class="`stat-card--${tone}`">
    <div class="stat-top">
      <span class="stat-label">{{ label }}</span>
      <span class="stat-icon">
        <AppIcon :name="icon" :size="20" />
      </span>
    </div>
    <div v-if="loading" class="skeleton stat-skeleton" aria-hidden="true" />
    <div
      v-else
      class="stat-value"
      :class="{ 'stat-value--muted': value === null || value === undefined }"
    >
      {{ value ?? '—' }}
    </div>
    <p class="stat-hint">{{ hint || '\u00a0' }}</p>
  </article>
</template>
