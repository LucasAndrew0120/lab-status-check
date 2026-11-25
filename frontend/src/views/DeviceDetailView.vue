<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '../api'
import AppIcon from '../components/AppIcon.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import StatePanel from '../components/StatePanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { formatDate, formatDateTime, formatRelative, formatTime } from '../utils/format'
import { faultStatusOptions, statusMeta } from '../utils/status'
import { useToast } from '../composables/useToast'

const route = useRoute()
const toast = useToast()

const deviceId = computed(() => Number(route.params.id))
const device = ref(null)
const inspections = ref([])
const inspectionsTotal = ref(0)
const loading = ref(true)
const error = ref('')
const inspectionsLoading = ref(true)
const inspectionsError = ref('')
const refreshing = ref(false)

const inspectionFormCard = ref(null)
const noteInput = ref(null)

const inspectionForm = reactive({ result: 'normal', note: '' })
const submitting = ref(false)
const inspectionError = ref('')

const faultFormOpen = ref(false)
const faultForm = reactive({ fault_status: 'pending', fault_description: '' })
const faultSaving = ref(false)
const faultError = ref('')
const faultActionLoading = ref(false)
const resolveDialogOpen = ref(false)

const hasActiveFault = computed(() => ['pending', 'processing'].includes(device.value?.fault_status))
const faultMeta = computed(() => statusMeta('fault', device.value?.fault_status))

async function loadPage() {
  loading.value = true
  error.value = ''
  inspectionsLoading.value = true
  inspectionsError.value = ''
  inspectionError.value = ''
  faultFormOpen.value = false
  faultError.value = ''
  inspectionForm.result = 'normal'
  inspectionForm.note = ''

  const [deviceResult, inspectionsResult] = await Promise.allSettled([
    api.getDevice(deviceId.value),
    api.listInspections(deviceId.value)
  ])

  if (deviceResult.status === 'rejected') {
    device.value = null
    inspections.value = []
    error.value = deviceResult.reason?.message || '设备加载失败'
    loading.value = false
    inspectionsLoading.value = false
    return
  }

  device.value = deviceResult.value
  loading.value = false

  if (inspectionsResult.status === 'fulfilled') {
    inspections.value = inspectionsResult.value.items
    inspectionsTotal.value = inspectionsResult.value.total
  } else {
    inspectionsError.value = inspectionsResult.reason?.message || '巡检记录加载失败'
  }
  inspectionsLoading.value = false
}

async function refreshAll() {
  if (refreshing.value) return
  refreshing.value = true

  const [deviceResult, inspectionsResult] = await Promise.allSettled([
    api.getDevice(deviceId.value),
    api.listInspections(deviceId.value)
  ])

  if (deviceResult.status === 'fulfilled') {
    device.value = deviceResult.value
  } else {
    toast.error('刷新设备失败', deviceResult.reason?.message || '请稍后重试')
  }

  if (inspectionsResult.status === 'fulfilled') {
    inspections.value = inspectionsResult.value.items
    inspectionsTotal.value = inspectionsResult.value.total
    inspectionsError.value = ''
  } else {
    inspectionsError.value = inspectionsResult.reason?.message || '巡检记录加载失败'
  }

  refreshing.value = false
}

async function submitInspection() {
  const note = inspectionForm.note.trim()
  if (!note) {
    inspectionError.value = '请填写巡检备注（1–500 字）'
    noteInput.value?.focus()
    return
  }
  if (note.length > 500) {
    inspectionError.value = '巡检备注不能超过 500 字'
    return
  }

  submitting.value = true
  inspectionError.value = ''
  const result = inspectionForm.result

  try {
    await api.createInspection(deviceId.value, { result, note })
    inspectionForm.note = ''
    inspectionForm.result = 'normal'

    if (result === 'abnormal') {
      toast.warning('异常巡检已记录', '设备故障状态已同步，请在故障管理中跟进。')
    } else {
      toast.success('巡检记录已提交', '设备巡检时间与记录已更新。')
    }

    await refreshAll()
  } catch (submitError) {
    inspectionError.value = submitError.message
    toast.error('提交失败', submitError.message)
  } finally {
    submitting.value = false
  }
}

function openFaultForm() {
  if (!device.value) return
  faultForm.fault_status = hasActiveFault.value ? device.value.fault_status : 'pending'
  faultForm.fault_description = device.value.fault_description || ''
  faultError.value = ''
  faultFormOpen.value = true
  nextTick(() => document.getElementById('fault-description')?.focus())
}

function closeFaultForm() {
  if (faultSaving.value) return
  faultFormOpen.value = false
  faultError.value = ''
}

async function saveFault() {
  const nextStatus = faultForm.fault_status
  if (nextStatus === 'resolved' && !hasActiveFault.value) {
    faultError.value = '当前没有可解决的故障'
    return
  }

  const description = faultForm.fault_description.trim()
  if (description.length > 500) {
    faultError.value = '故障描述不能超过 500 字'
    return
  }

  const payload = { fault_status: nextStatus }
  if (nextStatus !== 'resolved' && description) {
    payload.fault_description = description
  }

  faultSaving.value = true
  faultError.value = ''
  try {
    const updated = await api.updateFault(deviceId.value, payload)
    device.value = updated
    faultFormOpen.value = false
    toast.success('故障状态已更新', `当前状态：${statusMeta('fault', nextStatus).label}`)
  } catch (saveError) {
    faultError.value = saveError.message
    toast.error('更新失败', saveError.message)
  } finally {
    faultSaving.value = false
  }
}

async function startProcessing() {
  faultActionLoading.value = true
  faultError.value = ''
  try {
    const updated = await api.updateFault(deviceId.value, { fault_status: 'processing' })
    device.value = updated
    toast.success('已开始处理', '故障状态已更新为「处理中」。')
  } catch (actionError) {
    faultError.value = actionError.message
    toast.error('操作失败', actionError.message)
  } finally {
    faultActionLoading.value = false
  }
}

function askResolve() {
  faultError.value = ''
  resolveDialogOpen.value = true
}

async function resolveFault() {
  faultActionLoading.value = true
  try {
    const updated = await api.updateFault(deviceId.value, { fault_status: 'resolved' })
    device.value = updated
    resolveDialogOpen.value = false
    toast.success('故障已解决', '设备状态已恢复为正常。')
  } catch (resolveError) {
    resolveDialogOpen.value = false
    faultError.value = resolveError.message
    toast.error('标记失败', resolveError.message)
  } finally {
    faultActionLoading.value = false
  }
}

function scrollToInspectionForm() {
  inspectionFormCard.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => noteInput.value?.focus({ preventScroll: true }), 300)
}

watch(deviceId, () => {
  if (deviceId.value) loadPage()
})

onMounted(loadPage)
</script>

<template>
  <div v-if="loading" class="page">
    <div class="skeleton skeleton-line" style="width: 128px; height: 12px; margin-bottom: 22px" />
    <div class="skeleton skeleton-line" style="width: 300px; height: 30px; margin-bottom: 14px" />
    <div class="skeleton skeleton-line" style="width: 440px; height: 14px; margin-bottom: 30px" />
    <div class="detail-grid">
      <div class="detail-main">
        <div class="skeleton skeleton-block" style="height: 236px" />
        <div class="skeleton skeleton-block" style="height: 340px" />
      </div>
      <div class="detail-side">
        <div class="skeleton skeleton-block" style="height: 402px" />
        <div class="skeleton skeleton-block" style="height: 220px" />
      </div>
    </div>
  </div>

  <div v-else-if="error" class="page">
    <StatePanel variant="error" title="设备加载失败" :message="error">
      <button type="button" class="btn" @click="loadPage">重新加载</button>
      <RouterLink to="/devices" class="btn btn--primary">返回设备台账</RouterLink>
    </StatePanel>
  </div>

  <div v-else-if="device" class="page">
    <RouterLink to="/devices" class="back-link">
      <AppIcon name="arrow-left" :size="15" />
      返回设备台账
    </RouterLink>

    <header class="page-head detail-head">
      <div>
        <p class="eyebrow">Device Profile · 设备详情</p>
        <div class="detail-title-row">
          <h1 class="page-title">{{ device.name }}</h1>
          <StatusBadge type="device" :value="device.status" />
          <StatusBadge type="fault" :value="device.fault_status" />
        </div>
        <div class="detail-meta">
          <span class="meta-item">
            <AppIcon name="map-pin" :size="14" />
            {{ device.location }}
          </span>
          <span class="meta-item">
            <AppIcon name="cpu" :size="14" />
            {{ device.model }}
          </span>
          <span class="meta-item">
            <AppIcon name="hash" :size="14" />
            设备 #{{ device.id }}
          </span>
          <span class="meta-item">
            <AppIcon name="clock" :size="14" />
            最近巡检 {{ formatRelative(device.last_inspection_at) }}
          </span>
        </div>
      </div>
      <div class="page-actions">
        <button type="button" class="btn" :disabled="refreshing" @click="refreshAll">
          <AppIcon name="refresh" :size="16" :class="{ spin: refreshing }" />
          刷新
        </button>
        <button type="button" class="btn btn--primary" @click="scrollToInspectionForm">
          <AppIcon name="plus" :size="16" />
          登记巡检
        </button>
      </div>
    </header>

    <div class="detail-grid">
      <div class="detail-main">
        <section class="card">
          <div class="card-head">
            <div>
              <h2 class="card-title">故障管理</h2>
              <p class="card-sub">登记故障、跟进处理进度或标记解决</p>
            </div>
            <StatusBadge type="fault" :value="device.fault_status" />
          </div>

          <div class="card-body">
            <div
              v-if="device.fault_status"
              class="fault-note"
              :class="`fault-note--${faultMeta.tone}`"
            >
              <span class="fault-note-icon">
                <AppIcon
                  :name="hasActiveFault ? 'alert-triangle' : 'check-circle'"
                  :size="20"
                />
              </span>
              <div class="fault-note-content">
                <div class="fault-note-title">
                  {{ hasActiveFault ? '当前故障' : '故障已解决' }} · {{ faultMeta.label }}
                </div>
                <p class="fault-note-desc">
                  {{ device.fault_description || '暂无故障描述' }}
                </p>
                <p class="fault-note-time">
                  更新于 {{ formatDateTime(device.updated_at) }}
                </p>
              </div>
            </div>

            <div v-else class="fault-empty">
              <span class="fault-empty-icon">
                <AppIcon name="check-circle" :size="22" />
              </span>
              <div>
                <p class="fault-empty-title">当前没有故障记录</p>
                <p class="fault-empty-text">设备运行正常；发现异常时可在下方登记故障。</p>
              </div>
            </div>

            <p v-if="faultError && !faultFormOpen" class="form-error" role="alert">
              <AppIcon name="alert-circle" :size="15" />
              {{ faultError }}
            </p>

            <div v-if="!faultFormOpen" class="fault-actions">
              <button
                v-if="hasActiveFault && device.fault_status === 'pending'"
                type="button"
                class="btn"
                :disabled="faultActionLoading"
                @click="startProcessing"
              >
                <span v-if="faultActionLoading" class="spinner" aria-hidden="true" />
                <AppIcon v-else name="wrench" :size="16" />
                开始处理
              </button>
              <button
                v-if="hasActiveFault"
                type="button"
                class="btn btn--success"
                :disabled="faultActionLoading"
                @click="askResolve"
              >
                <AppIcon name="check-circle" :size="16" />
                标记已解决
              </button>
              <button
                v-if="hasActiveFault"
                type="button"
                class="btn btn--ghost"
                :disabled="faultActionLoading"
                @click="openFaultForm"
              >
                编辑故障信息
              </button>
              <button
                v-if="device.fault_status === 'resolved'"
                type="button"
                class="btn"
                @click="openFaultForm"
              >
                <AppIcon name="plus" :size="16" />
                重新登记故障
              </button>
              <button
                v-if="!hasActiveFault && !device.fault_status"
                type="button"
                class="btn"
                @click="openFaultForm"
              >
                <AppIcon name="plus" :size="16" />
                登记故障
              </button>
            </div>

            <form v-else class="fault-form" @submit.prevent="saveFault">
              <div class="field">
                <span class="field-label">故障状态</span>
                <div class="option-grid" role="group" aria-label="故障状态">
                  <button
                    v-for="option in faultStatusOptions"
                    :key="option.value"
                    type="button"
                    class="option-card"
                    :class="{ active: faultForm.fault_status === option.value }"
                    :disabled="option.value === 'resolved' && !hasActiveFault"
                    :aria-pressed="faultForm.fault_status === option.value"
                    @click="faultForm.fault_status = option.value"
                  >
                    <span class="option-title">{{ option.label }}</span>
                    <span class="option-desc">
                      {{
                        option.value === 'resolved' && !hasActiveFault
                          ? '当前没有可解决的故障'
                          : option.description
                      }}
                    </span>
                  </button>
                </div>
              </div>

              <div class="field">
                <label class="field-label" for="fault-description">
                  故障描述
                  <span class="field-optional">选填</span>
                </label>
                <textarea
                  id="fault-description"
                  v-model="faultForm.fault_description"
                  class="textarea"
                  rows="3"
                  maxlength="500"
                  placeholder="描述故障现象、影响范围或处理进展…"
                />
                <div class="field-foot">
                  <span>留空将保留当前描述</span>
                  <span>{{ faultForm.fault_description.length }} / 500</span>
                </div>
              </div>

              <p v-if="faultForm.fault_status === 'resolved'" class="form-hint">
                <AppIcon name="info" :size="14" />
                标记已解决时仅更新故障状态和设备状态，故障描述保留原记录。
              </p>

              <p v-if="faultError" class="form-error" role="alert">
                <AppIcon name="alert-circle" :size="15" />
                {{ faultError }}
              </p>

              <div class="fault-form-actions">
                <button type="button" class="btn" :disabled="faultSaving" @click="closeFaultForm">
                  取消
                </button>
                <button type="submit" class="btn btn--primary" :disabled="faultSaving">
                  <span v-if="faultSaving" class="spinner" aria-hidden="true" />
                  <AppIcon v-else name="check" :size="16" />
                  {{ faultSaving ? '保存中…' : '保存故障状态' }}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2 class="card-title">
                巡检记录
                <span class="count-pill">{{ inspectionsTotal }}</span>
              </h2>
              <p class="card-sub">按巡检时间倒序，最新记录在前</p>
            </div>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              :disabled="refreshing"
              @click="refreshAll"
            >
              <AppIcon name="refresh" :size="14" :class="{ spin: refreshing }" />
              刷新
            </button>
          </div>

          <div
            v-if="inspectionsLoading"
            class="timeline-skeleton"
            role="status"
            aria-label="正在加载巡检记录"
          >
            <div v-for="index in 3" :key="index" class="timeline-skeleton-row">
              <div class="skeleton skeleton-line" style="width: 46px; height: 28px" />
              <div class="skeleton-lines">
                <span class="skeleton skeleton-line" style="width: 118px" />
                <span class="skeleton skeleton-line" style="width: 82%" />
                <span class="skeleton skeleton-line" style="width: 54%" />
              </div>
            </div>
          </div>

          <div v-else-if="inspectionsError" class="list-state">
            <StatePanel variant="error" title="巡检记录加载失败" :message="inspectionsError" compact>
              <button type="button" class="btn btn--sm" @click="refreshAll">重试</button>
            </StatePanel>
          </div>

          <div v-else-if="!inspections.length" class="list-state">
            <StatePanel
              variant="empty"
              icon="clipboard"
              title="还没有巡检记录"
              message="使用「登记巡检」表单登记第一条记录，记录会显示在这里。"
              compact
            />
          </div>

          <ol v-else class="timeline">
            <li v-for="item in inspections" :key="item.id" class="timeline-item">
              <div class="timeline-date">
                <strong>{{ formatDate(item.created_at) }}</strong>
                <span>{{ formatTime(item.created_at) }}</span>
              </div>
              <div
                class="timeline-content"
                :class="`timeline-content--${statusMeta('inspection', item.result).tone}`"
              >
                <div class="timeline-top">
                  <StatusBadge type="inspection" :value="item.result" />
                  <span class="timeline-id">记录 #{{ item.id }}</span>
                </div>
                <p class="timeline-note">{{ item.note }}</p>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <aside class="detail-side">
        <section id="inspection-form" ref="inspectionFormCard" class="card">
          <div class="card-head">
            <div>
              <h2 class="card-title">登记巡检</h2>
              <p class="card-sub">记录本次巡检结果与备注</p>
            </div>
            <span class="head-ghost">
              <AppIcon name="clipboard" :size="18" />
            </span>
          </div>

          <form class="card-body inspection-form" @submit.prevent="submitInspection">
            <div class="field">
              <span class="field-label">巡检结果</span>
              <div class="result-toggle" role="group" aria-label="巡检结果">
                <button
                  type="button"
                  class="result-option result-option--normal"
                  :class="{ active: inspectionForm.result === 'normal' }"
                  :aria-pressed="inspectionForm.result === 'normal'"
                  @click="inspectionForm.result = 'normal'"
                >
                  <AppIcon name="check-circle" :size="20" />
                  <span>
                    <strong>正常</strong>
                    <small>设备运行正常</small>
                  </span>
                </button>
                <button
                  type="button"
                  class="result-option result-option--abnormal"
                  :class="{ active: inspectionForm.result === 'abnormal' }"
                  :aria-pressed="inspectionForm.result === 'abnormal'"
                  @click="inspectionForm.result = 'abnormal'"
                >
                  <AppIcon name="alert-triangle" :size="20" />
                  <span>
                    <strong>异常</strong>
                    <small>发现设备问题</small>
                  </span>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field-label" for="inspection-note">
                巡检备注
                <span class="field-required">必填</span>
              </label>
              <textarea
                id="inspection-note"
                ref="noteInput"
                v-model="inspectionForm.note"
                class="textarea"
                rows="4"
                maxlength="500"
                placeholder="例如：运行正常，无异常声音，读数稳定…"
              />
              <div class="field-foot">
                <span>1–500 字</span>
                <span>{{ inspectionForm.note.length }} / 500</span>
              </div>
            </div>

            <p v-if="inspectionError" class="form-error" role="alert">
              <AppIcon name="alert-circle" :size="15" />
              {{ inspectionError }}
            </p>

            <p class="form-hint">
              <AppIcon name="info" :size="14" />
              提交「异常」时，若设备当前没有活动故障，系统会自动登记为「待处理」。
            </p>

            <button type="submit" class="btn btn--primary btn--block" :disabled="submitting">
              <span v-if="submitting" class="spinner" aria-hidden="true" />
              <AppIcon v-else name="plus" :size="16" />
              {{ submitting ? '提交中…' : '提交巡检记录' }}
            </button>
          </form>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2 class="card-title">设备档案</h2>
              <p class="card-sub">基础信息与时间记录</p>
            </div>
          </div>
          <div class="card-body">
            <dl class="info-list">
              <div class="info-row">
                <dt>设备编号</dt>
                <dd>#{{ device.id }}</dd>
              </div>
              <div class="info-row">
                <dt>设备状态</dt>
                <dd><StatusBadge type="device" :value="device.status" /></dd>
              </div>
              <div class="info-row">
                <dt>最近巡检</dt>
                <dd>{{ formatDateTime(device.last_inspection_at) }}</dd>
              </div>
              <div class="info-row">
                <dt>创建时间</dt>
                <dd>{{ formatDateTime(device.created_at) }}</dd>
              </div>
              <div class="info-row">
                <dt>更新时间</dt>
                <dd>{{ formatDateTime(device.updated_at) }}</dd>
              </div>
            </dl>
          </div>
        </section>
      </aside>
    </div>

    <ConfirmDialog
      :open="resolveDialogOpen"
      title="标记故障为已解决？"
      :message="`确认「${device.name}」的故障已经修复？设备状态将恢复为正常。`"
      confirm-text="确认解决"
      tone="primary"
      :loading="faultActionLoading"
      @confirm="resolveFault"
      @cancel="resolveDialogOpen = false"
    />
  </div>
</template>
