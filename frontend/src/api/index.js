import { mockApi } from './mock'
import { realApi } from './real'

const flag = import.meta.env.VITE_USE_MOCK
const hasFlag = typeof flag === 'string' && flag.trim() !== ''

// 后端已完成，默认连接真实接口；需要离线演示时设置 VITE_USE_MOCK=true。
export const isMock = hasFlag ? flag.toLowerCase() === 'true' : false

export const api = isMock ? mockApi : realApi

/**
 * 优先使用 GET /api/stats。
 * 兼容尚未提供该接口的旧后端：仅在 404 时用设备与巡检列表即时汇总。
 */
export async function fetchDashboardStats() {
  try {
    const data = await api.getStats()
    return { data, fallback: false }
  } catch (error) {
    if (error?.status !== 404) throw error
  }

  const { items } = await api.listDevices()
  const inspections = await Promise.all(
    items.map((device) => api.listInspections(device.id))
  )

  const countByFaultStatus = (status) =>
    items.filter((device) => device.fault_status === status).length

  return {
    fallback: true,
    data: {
      total_devices: items.length,
      normal_devices: items.filter((device) => device.status === 'normal').length,
      fault_devices: items.filter((device) =>
        ['pending', 'processing'].includes(device.fault_status)
      ).length,
      pending_faults: countByFaultStatus('pending'),
      processing_faults: countByFaultStatus('processing'),
      resolved_faults: countByFaultStatus('resolved'),
      total_inspections: inspections.reduce((total, result) => total + result.total, 0)
    }
  }
}
