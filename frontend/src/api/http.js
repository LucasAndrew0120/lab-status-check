const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

/**
 * 统一的接口错误。message 可以直接展示给用户。
 */
export class ApiError extends Error {
  constructor(message, { status = 0, detail = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

function extractDetail(payload) {
  const detail = payload?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item
        const loc = Array.isArray(item?.loc) ? item.loc.slice(1).join('.') : ''
        return [loc, item?.msg].filter(Boolean).join('：')
      })
      .filter(Boolean)
    if (parts.length) return parts.join('；')
  }
  return ''
}

/**
 * @param {string} path 以 / 开头的接口路径，例如 /devices
 * @param {{ method?: string, query?: Record<string, unknown>, body?: unknown }} options
 */
export async function request(path, { method = 'GET', query, body } = {}) {
  const search = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        search.set(key, String(value))
      }
    }
  }
  const qs = search.toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  let response
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', { status: 0 })
    }
    throw new ApiError('无法连接服务器，请确认后端已启动（127.0.0.1:8000）', { status: 0 })
  } finally {
    clearTimeout(timeout)
  }

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const fallback =
      response.status >= 500
        ? `服务暂时不可用（HTTP ${response.status}），请确认后端已启动（127.0.0.1:8000）`
        : `请求失败（HTTP ${response.status}）`
    throw new ApiError(extractDetail(payload) || fallback, {
      status: response.status,
      detail: payload?.detail ?? null
    })
  }

  return payload
}
