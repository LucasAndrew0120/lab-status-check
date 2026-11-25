<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { api, isMock } from './api'
import AppIcon from './components/AppIcon.vue'
import ToastHost from './components/ToastHost.vue'

const route = useRoute()
const health = ref(isMock ? 'mock' : 'checking')
const checking = ref(false)

const modeText = computed(() => {
  if (isMock) return 'Mock 演示模式'
  if (health.value === 'online') return '后端已连接'
  if (health.value === 'offline') return '后端未连接'
  return '正在连接后端'
})

const modeHint = computed(() => {
  if (isMock) return '内置示例数据 · 无需后端'
  if (health.value === 'offline') return '请启动 127.0.0.1:8000 后刷新'
  if (health.value === 'online') return 'API · 127.0.0.1:8000'
  return '正在检查 /api/health'
})

const modeClass = computed(() => (isMock ? 'mock' : health.value))
const devicesActive = computed(() => route.path.startsWith('/devices'))

async function checkHealth() {
  if (isMock) return
  checking.value = true
  health.value = 'checking'
  try {
    const data = await api.getHealth()
    health.value = data?.status === 'ok' ? 'online' : 'offline'
  } catch {
    health.value = 'offline'
  } finally {
    checking.value = false
  }
}

onMounted(checkHealth)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">
          <AppIcon name="flask" :size="21" />
        </span>
        <span class="brand-text">
          <strong>LabPulse</strong>
          <small>实验室设备巡检平台</small>
        </span>
      </RouterLink>

      <p class="nav-label">工作台</p>
      <nav class="nav">
        <RouterLink
          to="/"
          class="nav-item"
          exact-active-class="active"
          title="总览"
          aria-label="总览"
        >
          <AppIcon name="dashboard" :size="18" />
          <span>总览</span>
        </RouterLink>
        <RouterLink
          to="/devices"
          class="nav-item"
          :class="{ active: devicesActive }"
          title="设备台账"
          aria-label="设备台账"
        >
          <AppIcon name="monitor" :size="18" />
          <span>设备台账</span>
        </RouterLink>
      </nav>

      <div class="sidebar-spacer" />

      <div
        class="api-panel"
        :class="`api-panel--${modeClass}`"
        :title="`${modeText} · ${modeHint}`"
      >
        <div class="api-panel-row">
          <span class="api-dot" aria-hidden="true" />
          <span class="api-mode">{{ modeText }}</span>
          <button
            v-if="!isMock"
            type="button"
            class="api-refresh"
            :class="{ spinning: checking }"
            :disabled="checking"
            title="重新检查后端连接"
            aria-label="重新检查后端连接"
            @click="checkHealth"
          >
            <AppIcon name="refresh" :size="13" />
          </button>
        </div>
        <p class="api-hint">{{ modeHint }}</p>
      </div>

      <div class="sidebar-foot">
        <span>LabPulse v0.1</span>
        <span>实训项目</span>
      </div>
    </aside>

    <main class="main">
      <RouterView />
    </main>

    <ToastHost />
  </div>
</template>
