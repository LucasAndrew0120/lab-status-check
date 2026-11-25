<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api, fetchDashboardStats } from '../api'
import AppIcon from '../components/AppIcon.vue'
import StatCard from '../components/StatCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import StatePanel from '../components/StatePanel.vue'
import { formatNumber, formatRelative, formatToday } from '../utils/format'

const stats = ref(null)
const statsFallback = ref(false)
const faultDevices = ref([])
const statsLoading = ref(true)
const faultsLoading = ref(true)
const statsError = ref('')
const faultsError = ref('')
const refreshing = ref(false)
const today = formatToday()

const normalPercent = computed(() => {
  if (!stats.value?.total_devices) return 0
  return (stats.value.normal_devices / stats.value.total_devices) * 100
})

const normalRate = computed(() => Math.round(normalPercent.value))
const faultPercent = computed(() => (stats.value?.total_devices ? 100 - normalPercent.value : 0))

const faultRecords = computed(() => {
  const value = stats.value
  if (!value) return 0
  return value.pending_faults + value.processing_faults + value.resolved_faults
})

const activeFaultCount = computed(() => {
  if (stats.value) return stats.value.pending_faults + stats.value.processing_faults
  if (faultsError.value) return '—'
  return faultDevices.value.length
})

const sortedFaults = computed(() => {
  const priority = { pending: 0, processing: 1 }
  return [...faultDevices.value].sort((a, b) => {
    const diff = (priority[a.fault_status] ?? 9) - (priority[b.fault_status] ?? 9)
    if (diff !== 0) return diff
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
})

const faultRows = computed(() => [
  { label: '待处理', value: stats.value?.pending_faults ?? 0, color: 'bar-fill--warning' },
  { label: '处理中', value: stats.value?.processing_faults ?? 0, color: 'bar-fill--info' },
  { label: '已解决', value: stats.value?.resolved_faults ?? 0, color: 'bar-fill--success' }
])

function percentOfFaults(value) {
  if (!faultRecords.value) return 0
  return (value / faultRecords.value) * 100
}

async function loadStats() {
  if (!stats.value) statsLoading.value = true
  statsError.value = ''
  try {
    const result = await fetchDashboardStats()
    stats.value = result.data
    statsFallback.value = result.fallback
  } catch (error) {
    statsError.value = error.message
  } finally {
    statsLoading.value = false
  }
}

async function loadFaults() {
  if (!faultDevices.value.length) faultsLoading.value = true
  faultsError.value = ''
  try {
    const result = await api.listDevices({ status: 'fault' })
    faultDevices.value = result.items
  } catch (error) {
    faultsError.value = error.message
  } finally {
    faultsLoading.value = false
  }
}

async function refreshAll() {
  if (refreshing.value) return
  refreshing.value = true
  await Promise.allSettled([loadStats(), loadFaults()])
  refreshing.value = false
}

onMounted(() => {
  loadStats()
  loadFaults()
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Dashboard · 设备总览</p>
        <h1 class="page-title">实验室运行总览</h1>
        <p class="page-sub">{{ today }} · 掌握设备健康状态与故障处理进度</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn" :disabled="refreshing" @click="refreshAll">
          <AppIcon name="refresh" :size="16" :class="{ spin: refreshing }" />
          刷新数据
        </button>
        <RouterLink to="/devices" class="btn btn--primary">
          设备台账
          <AppIcon name="chevron-right" :size="16" />
        </RouterLink>
      </div>
    </header>

    <div v-if="statsError" class="inline-alert" role="alert">
      <AppIcon name="alert-circle" :size="17" />
      <span>{{ statsError }}</span>
      <button type="button" class="inline-alert-action" @click="loadStats">重试</button>
    </div>

    <section class="stats-grid" aria-label="核心统计">
      <StatCard
        label="设备总数"
        :value="stats?.total_devices ?? null"
        icon="cpu"
        tone="blue"
        hint="实验室在册设备"
        :loading="statsLoading && !stats"
      />
      <StatCard
        label="状态正常"
        :value="stats?.normal_devices ?? null"
        icon="check-circle"
        tone="green"
        :hint="stats ? `正常率 ${normalRate}%` : '统计暂不可用'"
        :loading="statsLoading && !stats"
      />
      <StatCard
        label="故障设备"
        :value="stats?.fault_devices ?? null"
        icon="alert-triangle"
        tone="red"
        hint="待处理 + 处理中"
        :loading="statsLoading && !stats"
      />
      <StatCard
        label="待处理故障"
        :value="stats?.pending_faults ?? null"
        icon="clock"
        tone="amber"
        hint="需尽快安排处理"
        :loading="statsLoading && !stats"
      />
    </section>

    <div class="home-grid">
      <section class="card fault-queue">
        <div class="card-head">
          <div>
            <h2 class="card-title">
              故障处理队列
              <span class="count-pill">{{ activeFaultCount }}</span>
            </h2>
            <p class="card-sub">等待处理与正在维修的设备</p>
          </div>
          <RouterLink to="/devices?status=fault" class="card-link">
            查看全部
            <AppIcon name="chevron-right" :size="14" />
          </RouterLink>
        </div>

        <div
          v-if="faultsLoading && !faultDevices.length"
          class="queue-skeleton"
          role="status"
          aria-label="正在加载故障队列"
        >
          <div v-for="index in 3" :key="index" class="queue-skeleton-row">
            <div class="skeleton skeleton-avatar" />
            <div class="skeleton-lines">
              <div class="skeleton skeleton-line" style="width: 38%" />
              <div class="skeleton skeleton-line" style="width: 64%" />
            </div>
            <div class="skeleton skeleton-badge" />
          </div>
        </div>

        <template v-else-if="faultsError && !faultDevices.length">
          <StatePanel variant="error" title="故障队列加载失败" :message="faultsError" compact>
            <button type="button" class="btn btn--sm" @click="loadFaults">重新加载</button>
          </StatePanel>
        </template>

        <template v-else-if="!sortedFaults.length">
          <StatePanel
            variant="empty"
            icon="check-circle"
            title="全部设备运行正常"
            message="当前没有待处理或处理中的故障。"
            compact
          />
        </template>

        <div v-else class="fault-list">
          <div v-if="faultsError" class="inline-alert inline-alert--inside" role="alert">
            <AppIcon name="alert-circle" :size="16" />
            <span>{{ faultsError }}</span>
            <button type="button" class="inline-alert-action" @click="loadFaults">重试</button>
          </div>
          <RouterLink
            v-for="item in sortedFaults"
            :key="item.id"
            :to="`/devices/${item.id}`"
            class="fault-row"
          >
            <div class="fault-main">
              <span class="fault-avatar">
                <AppIcon name="monitor" :size="18" />
              </span>
              <div class="fault-info">
                <div class="fault-name">
                  {{ item.name }}
                  <span class="fault-location">{{ item.location }}</span>
                </div>
                <p class="fault-desc" :title="item.fault_description || '未填写故障描述'">
                  {{ item.fault_description || '未填写故障描述' }}
                </p>
                <p class="fault-meta">
                  更新于 {{ formatRelative(item.updated_at) }} · {{ item.model }}
                </p>
              </div>
            </div>
            <div class="fault-side">
              <StatusBadge type="fault" :value="item.fault_status" />
              <span class="fault-link">
                去处理
                <AppIcon name="chevron-right" :size="13" />
              </span>
            </div>
          </RouterLink>
        </div>
      </section>

      <aside class="card health-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">设备健康度</h2>
            <p class="card-sub">设备状态与故障分布</p>
          </div>
          <span class="head-ghost">
            <AppIcon name="activity" :size="18" />
          </span>
        </div>

        <div
          v-if="statsLoading && !stats"
          class="card-body health-skeleton"
          role="status"
          aria-label="正在加载统计"
        >
          <div class="skeleton skeleton-line" style="width: 36%; height: 34px" />
          <div class="skeleton skeleton-line" style="width: 100%; height: 10px; margin-top: 18px" />
          <div class="skeleton skeleton-line" style="width: 72%; height: 13px; margin-top: 18px" />
          <div class="skeleton skeleton-line" style="width: 100%; height: 8px; margin-top: 24px" />
          <div class="skeleton skeleton-line" style="width: 100%; height: 8px; margin-top: 16px" />
          <div class="skeleton skeleton-line" style="width: 100%; height: 8px; margin-top: 16px" />
        </div>

        <StatePanel
          v-else-if="statsError && !stats"
          variant="error"
          title="统计数据加载失败"
          :message="statsError"
          compact
        >
          <button type="button" class="btn btn--sm" @click="loadStats">重新加载</button>
        </StatePanel>

        <div v-else-if="stats" class="card-body">
          <div class="health-number-row">
            <span class="health-number">
              {{ normalRate }}<small>%</small>
            </span>
            <span class="health-caption">
              设备状态正常
              <strong>{{ stats.normal_devices }} / {{ stats.total_devices }}</strong> 台
            </span>
          </div>

          <div
            class="stacked-bar"
            role="img"
            :aria-label="`正常设备 ${stats.normal_devices} 台，故障设备 ${stats.fault_devices} 台`"
          >
            <span class="stacked-normal" :style="{ width: `${normalPercent}%` }" />
            <span class="stacked-fault" :style="{ width: `${faultPercent}%` }" />
          </div>
          <div class="stacked-legend">
            <span><i class="legend-dot legend-dot--normal" />正常 {{ stats.normal_devices }}</span>
            <span><i class="legend-dot legend-dot--fault" />故障 {{ stats.fault_devices }}</span>
          </div>

          <div class="divider" />

          <div class="progress-list">
            <div v-for="row in faultRows" :key="row.label" class="progress-row">
              <div class="progress-label">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </div>
              <div class="bar">
                <span class="bar-fill" :class="row.color" :style="{ width: `${percentOfFaults(row.value)}%` }" />
              </div>
            </div>
          </div>

          <div class="divider" />

          <div class="inspection-total">
            <span class="inspection-icon">
              <AppIcon name="clipboard" :size="18" />
            </span>
            <div class="inspection-text">
              <strong>{{ formatNumber(stats.total_inspections) }}</strong>
              <span> 条巡检记录累计</span>
            </div>
            <RouterLink to="/devices" class="card-link">
              去巡检
              <AppIcon name="chevron-right" :size="13" />
            </RouterLink>
          </div>
          <p v-if="statsFallback" class="stats-source-note">
            <AppIcon name="info" :size="13" />
            后端 /api/stats 暂未启用，当前统计由设备与巡检接口汇总
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
