import { ApiError } from './http'

const HOUR = 60 * 60 * 1000

const hoursAgo = (hours) => new Date(Date.now() - hours * HOUR).toISOString()
const daysAgo = (days) => hoursAgo(days * 24)
const delay = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (value) => structuredClone(value)

function fail(status, message) {
  throw new ApiError(message, { status, detail: message })
}

function findDevice(deviceId) {
  const device = state.devices.find((item) => item.id === Number(deviceId))
  if (!device) fail(404, '设备不存在')
  return device
}

function createSeed() {
  const devices = [
    {
      id: 1,
      name: '数字示波器',
      location: 'A101',
      model: 'Tektronix TBS2000',
      status: 'normal',
      fault_status: null,
      fault_description: null,
      last_inspection_at: null,
      created_at: daysAgo(126),
      updated_at: null
    },
    {
      id: 2,
      name: '数字万用表',
      location: 'A101',
      model: 'Fluke 87V',
      status: 'normal',
      fault_status: null,
      fault_description: null,
      last_inspection_at: null,
      created_at: daysAgo(118),
      updated_at: null
    },
    {
      id: 3,
      name: '直流稳压电源',
      location: 'A102',
      model: 'Keysight E3631A',
      status: 'normal',
      fault_status: null,
      fault_description: null,
      last_inspection_at: null,
      created_at: daysAgo(112),
      updated_at: null
    },
    {
      id: 4,
      name: '函数信号发生器',
      location: 'A102',
      model: 'Rigol DG1022Z',
      status: 'normal',
      fault_status: null,
      fault_description: null,
      last_inspection_at: null,
      created_at: daysAgo(107),
      updated_at: null
    },
    {
      id: 5,
      name: '光学显微镜',
      location: 'B201',
      model: 'Olympus CX43',
      status: 'normal',
      fault_status: null,
      fault_description: null,
      last_inspection_at: null,
      created_at: daysAgo(99),
      updated_at: null
    },
    {
      id: 6,
      name: '电子分析天平',
      location: 'B201',
      model: 'Sartorius BCE224S',
      status: 'normal',
      fault_status: null,
      fault_description: null,
      last_inspection_at: null,
      created_at: daysAgo(92),
      updated_at: null
    },
    {
      id: 7,
      name: '恒温培养箱',
      location: 'B203',
      model: '上海一恒 BPX-272',
      status: 'fault',
      fault_status: 'pending',
      fault_description: '温度无法稳定在 37℃，偏差超过 1℃，培养实验已转移。',
      last_inspection_at: null,
      created_at: daysAgo(88),
      updated_at: null
    },
    {
      id: 8,
      name: '紫外可见分光光度计',
      location: 'A103',
      model: '岛津 UV-1900i',
      status: 'fault',
      fault_status: 'pending',
      fault_description: '开机自检报错 E09，无法进入测量界面。',
      last_inspection_at: null,
      created_at: daysAgo(76),
      updated_at: null
    },
    {
      id: 9,
      name: '高速冷冻离心机',
      location: 'B204',
      model: 'Thermo Sorvall ST8',
      status: 'fault',
      fault_status: 'processing',
      fault_description: '运行时有金属异响，已停机并联系维修。',
      last_inspection_at: null,
      created_at: daysAgo(69),
      updated_at: null
    },
    {
      id: 10,
      name: '台式 pH 计',
      location: 'A103',
      model: '梅特勒 FE28',
      status: 'normal',
      fault_status: 'resolved',
      fault_description: '读数漂移明显，校准后仍未改善。',
      last_inspection_at: null,
      created_at: daysAgo(61),
      updated_at: null
    }
  ]

  const inspections = []
  let inspectionId = 0

  function inspect(deviceId, result, note, hours) {
    const createdAt = hoursAgo(hours)
    inspections.push({
      id: ++inspectionId,
      device_id: deviceId,
      result,
      note,
      created_at: createdAt
    })
    const device = devices.find((item) => item.id === deviceId)
    if (!device.last_inspection_at || createdAt > device.last_inspection_at) {
      device.last_inspection_at = createdAt
    }
  }

  inspect(1, 'normal', '基线校准完成，波形显示稳定，探头外观无破损。', 5)
  inspect(1, 'normal', '通道 1 / 2 自检通过，屏幕亮度正常。', 30)
  inspect(1, 'normal', '例行巡检，设备运行正常。', 168)

  inspect(2, 'normal', '读数与标准源一致，表笔绝缘层完好。', 9)
  inspect(2, 'normal', '电池电量充足，通断测试正常。', 54)
  inspect(2, 'normal', '外观清洁，按键回弹正常。', 144)

  inspect(3, 'normal', '三路输出稳定，接线端子无松动，散热正常。', 12)
  inspect(3, 'normal', '电压电流显示准确，过流保护测试通过。', 76)
  inspect(3, 'normal', '例行巡检，无异常。', 200)

  inspect(4, 'normal', '正弦波、方波输出正常，频率误差在允许范围内。', 26)
  inspect(4, 'normal', '幅度调节顺畅，输出接口无氧化。', 98)
  inspect(4, 'normal', '例行巡检，设备运行正常。', 220)

  inspect(5, 'normal', '物镜转换顺畅，光源亮度正常，载物台清洁。', 31)
  inspect(5, 'normal', '目镜成像清晰，调焦机构正常。', 122)

  inspect(6, 'normal', '水平校准通过，称量误差小于 0.1 mg。', 35)
  inspect(6, 'normal', '防风罩开合正常，砝码校准通过。', 151)

  inspect(7, 'abnormal', '温度无法稳定在 37℃，偏差超过 1℃，培养实验已转移。', 6)
  inspect(7, 'normal', '升温正常，温度波动在 ±0.3℃ 内。', 49)
  inspect(7, 'normal', '门封条完好，水箱水位正常。', 170)

  inspect(8, 'abnormal', '开机自检报错 E09，无法进入测量界面。', 28)
  inspect(8, 'normal', '波长校准通过，基线平稳。', 80)

  inspect(9, 'abnormal', '运行时有金属异响，已停机并联系维修。', 50)
  inspect(9, 'normal', '转速稳定，制冷正常，转子无裂纹。', 124)

  inspect(10, 'normal', '更换 pH 电极并重新校准，读数恢复稳定。', 40)
  inspect(10, 'abnormal', '读数漂移明显，使用标准缓冲液校准后仍未改善。', 70)
  inspect(10, 'normal', '电极保护液充足，读数正常。', 172)

  const faultUpdatedAt = {
    7: hoursAgo(6),
    8: hoursAgo(28),
    9: hoursAgo(50),
    10: hoursAgo(44)
  }

  for (const device of devices) {
    const latestFaultUpdate = device.fault_status ? faultUpdatedAt[device.id] : null
    device.updated_at =
      latestFaultUpdate && latestFaultUpdate > device.last_inspection_at
        ? latestFaultUpdate
        : device.last_inspection_at
  }

  return { devices, inspections }
}

const state = createSeed()

const activeFaults = ['pending', 'processing']

export const mockApi = {
  async getHealth() {
    await delay(120)
    return { status: 'ok' }
  },

  async getStats() {
    await delay()
    const { devices, inspections } = state
    return {
      total_devices: devices.length,
      normal_devices: devices.filter((device) => device.status === 'normal').length,
      fault_devices: devices.filter((device) => activeFaults.includes(device.fault_status)).length,
      pending_faults: devices.filter((device) => device.fault_status === 'pending').length,
      processing_faults: devices.filter((device) => device.fault_status === 'processing').length,
      resolved_faults: devices.filter((device) => device.fault_status === 'resolved').length,
      total_inspections: inspections.length
    }
  },

  async listDevices({ keyword = '', status = '', fault_status = '' } = {}) {
    await delay()
    if (status && !['normal', 'fault'].includes(status)) {
      fail(422, 'status 必须是 normal 或 fault')
    }
    if (fault_status && !['pending', 'processing', 'resolved'].includes(fault_status)) {
      fail(422, 'fault_status 必须是 pending、processing 或 resolved 之一')
    }

    const normalizedKeyword = String(keyword ?? '').trim().toLowerCase()
    const items = state.devices
      .filter((device) => {
        if (normalizedKeyword && !device.name.toLowerCase().includes(normalizedKeyword)) return false
        if (status && device.status !== status) return false
        if (fault_status && device.fault_status !== fault_status) return false
        return true
      })
      .sort((a, b) => a.id - b.id)

    return { items: clone(items), total: items.length }
  },

  async getDevice(deviceId) {
    await delay(220)
    return clone(findDevice(deviceId))
  },

  async listInspections(deviceId) {
    await delay(240)
    findDevice(deviceId)
    const items = state.inspections
      .filter((inspection) => inspection.device_id === Number(deviceId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return { items: clone(items), total: items.length }
  },

  async createInspection(deviceId, payload = {}) {
    await delay(360)
    const device = findDevice(deviceId)

    if (!['normal', 'abnormal'].includes(payload.result)) {
      fail(422, '巡检结果必须是 normal 或 abnormal')
    }

    const note = typeof payload.note === 'string' ? payload.note.trim() : ''
    if (!note) fail(422, '巡检备注不能为空')
    if (note.length > 500) fail(422, '巡检备注不能超过 500 字')

    const now = new Date().toISOString()
    const inspection = {
      id: Math.max(0, ...state.inspections.map((item) => item.id)) + 1,
      device_id: device.id,
      result: payload.result,
      note,
      created_at: now
    }
    state.inspections.push(inspection)

    device.last_inspection_at = now
    device.updated_at = now

    // 与后端约定一致：异常巡检会为无活动故障的设备自动创建 pending 故障
    if (payload.result === 'abnormal' && (device.fault_status === null || device.fault_status === 'resolved')) {
      device.fault_status = 'pending'
      device.fault_description = note
      device.status = 'fault'
    }

    return clone(inspection)
  },

  async updateFault(deviceId, payload = {}) {
    await delay(360)
    const device = findDevice(deviceId)
    const nextStatus = payload.fault_status

    if (!['pending', 'processing', 'resolved'].includes(nextStatus)) {
      fail(422, 'fault_status 必须是 pending、processing 或 resolved')
    }

    if (
      payload.fault_description !== undefined &&
      payload.fault_description !== null &&
      typeof payload.fault_description !== 'string'
    ) {
      fail(422, '故障描述必须是字符串')
    }
    if (typeof payload.fault_description === 'string' && payload.fault_description.length > 500) {
      fail(422, '故障描述不能超过 500 字')
    }

    if (nextStatus === 'resolved') {
      if (!activeFaults.includes(device.fault_status)) {
        fail(400, '当前没有可解决的故障')
      }
      device.fault_status = 'resolved'
      device.status = 'normal'
    } else {
      device.fault_status = nextStatus
      device.status = 'fault'
      if (payload.fault_description !== undefined) {
        device.fault_description = payload.fault_description
      }
    }

    device.updated_at = new Date().toISOString()
    return clone(device)
  }
}
