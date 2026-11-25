const pad = (value) => String(value).padStart(2, '0')

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 2026-11-24 10:30 */
export function formatDateTime(value) {
  const date = toDate(value)
  if (!date) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 11-24 10:30 */
export function formatShortDateTime(value) {
  const date = toDate(value)
  if (!date) return '—'
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 11-24 */
export function formatDate(value) {
  const date = toDate(value)
  if (!date) return '—'
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 10:30 */
export function formatTime(value) {
  const date = toDate(value)
  if (!date) return '—'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 刚刚 / 12 分钟前 / 3 小时前 / 2 天前 / 2026-10-01 */
export function formatRelative(value) {
  const date = toDate(value)
  if (!date) return '—'
  const diff = Date.now() - date.getTime()
  if (diff < 0) return formatDateTime(date)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return formatDateTime(date).slice(0, 10)
}

/** 页面头部展示的日期：2026年11月24日 星期二 */
export function formatToday() {
  const date = new Date()
  const day = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date)
  return `${day} ${weekday}`
}

export function formatNumber(value) {
  return typeof value === 'number' ? new Intl.NumberFormat('zh-CN').format(value) : '—'
}
