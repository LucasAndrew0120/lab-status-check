<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import AppIcon from '../components/AppIcon.vue'
import StatusBadge from '../components/StatusBadge.vue'
import StatePanel from '../components/StatePanel.vue'
import { formatDateTime, formatRelative } from '../utils/format'

const route = useRoute()
const router = useRouter()

const DEVICE_STATUSES = ['normal', 'fault']
const FAULT_STATUSES = ['pending', 'processing', 'resolved']

function initialQueryValue(value, allowed) {
  return typeof value === 'string' && allowed.includes(value) ? value : ''
}

const filters = reactive({
  keyword: typeof route.query.keyword === 'string' ? route.query.keyword : '',
  status: initialQueryValue(route.query.status, DEVICE_STATUSES),
  fault_status: initialQueryValue(route.query.fault_status, FAULT_STATUSES)
})

const devices = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

let debounceTimer = null
let requestId = 0

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'normal', label: '正常' },
  { value: 'fault', label: '故障' }
]

const hasFilters = computed(
  () => Boolean(filters.keyword.trim() || filters.status || filters.fault_status)
)

const emptyTitle = computed(() => (hasFilters.value ? '没有找到匹配的设备' : '暂无设备数据'))

const emptyMessage = computed(() =>
  hasFilters.value
    ? '试试更换搜索关键词，或清除状态筛选后重新查询。'
    : '请确认后端已完成设备数据初始化，或切换到 Mock 模式预览页面。'
)

function syncQuery() {
  const query = {}
  const keyword = filters.keyword.trim()
  if (keyword) query.keyword = keyword
  if (filters.status) query.status = filters.status
  if (filters.fault_status) query.fault_status = filters.fault_status

  const current = route.query
  const same =
    Object.keys(query).length === Object.keys(current).length &&
    Object.entries(query).every(([key, value]) => current[key] === value)

  if (!same) {
    router.replace({ path: '/devices', query }).catch(() => {})
  }
}

async function load() {
  const currentRequest = ++requestId
  loading.value = true
  error.value = ''

  try {
    const result = await api.listDevices({
      keyword: filters.keyword.trim(),
      status: filters.status,
      fault_status: filters.fault_status
    })
    if (currentRequest !== requestId) return
    devices.value = result.items
    total.value = result.total
  } catch (requestError) {
    if (currentRequest !== requestId) return
    devices.value = []
    total.value = 0
    error.value = requestError.message
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function loadNow() {
  window.clearTimeout(debounceTimer)
  load()
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  filters.fault_status = ''
}

function openDevice(id) {
  router.push(`/devices/${id}`)
}

watch(
  filters,
  () => {
    syncQuery()
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(load, filters.keyword.trim() ? 320 : 40)
  },
  { deep: true }
)

onMounted(() => {
  syncQuery()
  load()
})

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Inventory · 设备台账</p>
        <h1 class="page-title">设备台账</h1>
        <p class="page-sub">按名称搜索设备，组合状态筛选后点击查看巡检与故障详情</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn" :disabled="loading" @click="loadNow">
          <AppIcon name="refresh" :size="16" :class="{ spin: loading }" />
          刷新列表
        </button>
      </div>
    </header>

    <section class="card list-card">
      <div class="filter-bar">
        <div class="search-field">
          <AppIcon name="search" :size="16" class="search-icon" />
          <input
            v-model="filters.keyword"
            type="search"
            class="search-input"
            placeholder="按设备名称搜索…"
            aria-label="按设备名称搜索"
            autocomplete="off"
            @keydown.enter.prevent="loadNow"
          />
          <button
            v-if="filters.keyword"
            type="button"
            class="search-clear"
            aria-label="清除搜索关键词"
            @click="filters.keyword = ''"
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>

        <div class="segmented" role="group" aria-label="设备状态筛选">
          <button
            v-for="option in statusOptions"
            :key="option.value || 'all'"
            type="button"
            :class="{ active: filters.status === option.value }"
            :aria-pressed="filters.status === option.value"
            @click="filters.status = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="select-wrap">
          <AppIcon name="filter" :size="15" class="select-icon" />
          <select v-model="filters.fault_status" class="select" aria-label="故障状态筛选">
            <option value="">全部故障状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
          </select>
          <AppIcon name="chevron-right" :size="14" class="select-chevron" />
        </div>

        <button v-if="hasFilters" type="button" class="btn btn--ghost btn--sm reset-button" @click="resetFilters">
          清除筛选
        </button>
      </div>

      <div class="table-meta">
        <span v-if="loading" class="meta-loading">
          <span class="spinner" aria-hidden="true" />
          正在加载设备…
        </span>
        <span v-else-if="error">设备列表加载失败</span>
        <span v-else>共找到 <strong>{{ total }}</strong> 台设备</span>
        <span v-if="hasFilters" class="filter-note">
          <AppIcon name="filter" :size="13" />
          已应用筛选
        </span>
      </div>

      <div v-if="loading" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">设备</th>
              <th scope="col">存放位置</th>
              <th scope="col">设备状态</th>
              <th scope="col">故障状态</th>
              <th scope="col">最近巡检</th>
              <th scope="col"><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="index in 6" :key="index" class="skeleton-row">
              <td>
                <div class="device-cell">
                  <span class="skeleton skeleton-avatar" />
                  <span class="skeleton-lines">
                    <span class="skeleton skeleton-line" style="width: 112px" />
                    <span class="skeleton skeleton-line" style="width: 76px" />
                  </span>
                </div>
              </td>
              <td><span class="skeleton skeleton-line" style="width: 44px" /></td>
              <td><span class="skeleton skeleton-badge" /></td>
              <td><span class="skeleton skeleton-badge" /></td>
              <td><span class="skeleton skeleton-line" style="width: 88px" /></td>
              <td><span class="skeleton skeleton-line" style="width: 20px" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="error" class="list-state">
        <StatePanel variant="error" title="设备列表加载失败" :message="error">
          <button type="button" class="btn btn--sm" @click="loadNow">重新加载</button>
        </StatePanel>
      </div>

      <div v-else-if="!devices.length" class="list-state">
        <StatePanel variant="empty" :title="emptyTitle" :message="emptyMessage">
          <button v-if="hasFilters" type="button" class="btn btn--sm" @click="resetFilters">清除筛选条件</button>
        </StatePanel>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">设备</th>
              <th scope="col">存放位置</th>
              <th scope="col">设备状态</th>
              <th scope="col">故障状态</th>
              <th scope="col">最近巡检</th>
              <th scope="col"><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="device in devices"
              :key="device.id"
              tabindex="0"
              role="link"
              @click="openDevice(device.id)"
              @keydown.enter="openDevice(device.id)"
            >
              <td>
                <div class="device-cell">
                  <span class="device-avatar">
                    <AppIcon name="monitor" :size="18" />
                  </span>
                  <div>
                    <div class="device-name">{{ device.name }}</div>
                    <div class="device-model">{{ device.model }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="cell-primary">{{ device.location }}</div>
                <div class="cell-sub">设备编号 #{{ device.id }}</div>
              </td>
              <td>
                <StatusBadge type="device" :value="device.status" />
              </td>
              <td>
                <StatusBadge type="fault" :value="device.fault_status" />
                <p
                  v-if="device.fault_status && device.fault_description"
                  class="cell-sub cell-desc"
                  :title="device.fault_description"
                >
                  {{ device.fault_description }}
                </p>
              </td>
              <td>
                <div class="cell-primary">{{ formatRelative(device.last_inspection_at) }}</div>
                <div v-if="device.last_inspection_at" class="cell-sub">
                  {{ formatDateTime(device.last_inspection_at) }}
                </div>
              </td>
              <td class="cell-action">
                <span class="row-action">
                  <AppIcon name="chevron-right" :size="16" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
