import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '总览' }
  },
  {
    path: '/devices',
    name: 'devices',
    component: () => import('../views/DeviceListView.vue'),
    meta: { title: '设备台账' }
  },
  {
    path: '/devices/:id(\\d+)',
    name: 'device-detail',
    component: () => import('../views/DeviceDetailView.vue'),
    meta: { title: '设备详情' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // 同一页面内仅同步查询参数（搜索/筛选）时，保持当前滚动位置
    if (to.path === from.path) return {}
    return { top: 0 }
  }
})

router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} · LabPulse 实验室设备巡检`
    : 'LabPulse · 实验室设备巡检平台'
})

export default router
