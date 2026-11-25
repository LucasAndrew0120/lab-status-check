export const deviceStatusMap = {
  normal: { label: '正常', tone: 'success' },
  fault: { label: '故障', tone: 'danger' }
}

export const faultStatusMap = {
  pending: { label: '待处理', tone: 'warning' },
  processing: { label: '处理中', tone: 'info' },
  resolved: { label: '已解决', tone: 'success' }
}

export const inspectionResultMap = {
  normal: { label: '正常', tone: 'success' },
  abnormal: { label: '异常', tone: 'danger' }
}

const maps = {
  device: deviceStatusMap,
  fault: faultStatusMap,
  inspection: inspectionResultMap
}

export function statusMeta(type, value) {
  const map = maps[type] ?? deviceStatusMap
  if (value === null || value === undefined || value === '') {
    return { label: type === 'fault' ? '无故障' : '未知', tone: 'neutral' }
  }
  return map[value] ?? { label: String(value), tone: 'neutral' }
}

export const faultStatusOptions = [
  { value: 'pending', label: '待处理', description: '已发现异常，等待安排处理' },
  { value: 'processing', label: '处理中', description: '维修或处理正在进行' },
  { value: 'resolved', label: '已解决', description: '故障已修复，设备恢复正常' }
]
