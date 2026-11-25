import { request } from './http'

function compact(params) {
  const result = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      result[key] = value
    }
  }
  return result
}

/** 真实后端接口，路径与《实验室设备巡检平台 API 接口文档》一致。 */
export const realApi = {
  getHealth() {
    return request('/health')
  },

  getStats() {
    return request('/stats')
  },

  listDevices({ keyword = '', status = '', fault_status = '' } = {}) {
    return request('/devices', {
      query: compact({ keyword: keyword.trim(), status, fault_status })
    })
  },

  getDevice(deviceId) {
    return request(`/devices/${deviceId}`)
  },

  listInspections(deviceId) {
    return request(`/devices/${deviceId}/inspections`)
  },

  createInspection(deviceId, payload) {
    return request(`/devices/${deviceId}/inspections`, {
      method: 'POST',
      body: payload
    })
  },

  updateFault(deviceId, payload) {
    return request(`/devices/${deviceId}/fault`, {
      method: 'PATCH',
      body: payload
    })
  }
}
