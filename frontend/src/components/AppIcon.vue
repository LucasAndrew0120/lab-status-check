<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  strokeWidth: { type: [Number, String], default: 1.8 }
})

const icons = {
  dashboard: [
    ['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1.5 }],
    ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1.5 }],
    ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1.5 }],
    ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1.5 }]
  ],
  monitor: [
    ['rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }],
    ['line', { x1: 8, y1: 21, x2: 16, y2: 21 }],
    ['line', { x1: 12, y1: 17, x2: 12, y2: 21 }]
  ],
  search: [
    ['circle', { cx: 11, cy: 11, r: 8 }],
    ['line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }]
  ],
  x: [
    ['line', { x1: 18, y1: 6, x2: 6, y2: 18 }],
    ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }]
  ],
  refresh: [
    ['path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }],
    ['polyline', { points: '21 3 21 9 15 9' }]
  ],
  'alert-triangle': [
    ['path', { d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }],
    ['line', { x1: 12, y1: 9, x2: 12, y2: 13 }],
    ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }]
  ],
  'alert-circle': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 12, y1: 8, x2: 12, y2: 12 }],
    ['line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }]
  ],
  'check-circle': [
    ['path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }],
    ['polyline', { points: '22 4 12 14.01 9 11.01' }]
  ],
  check: [['polyline', { points: '20 6 9 17 4 12' }]],
  clock: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['polyline', { points: '12 6 12 12 16 14' }]
  ],
  cpu: [
    ['rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 }],
    ['rect', { x: 9, y: 9, width: 6, height: 6 }],
    ['line', { x1: 9, y1: 1, x2: 9, y2: 4 }],
    ['line', { x1: 15, y1: 1, x2: 15, y2: 4 }],
    ['line', { x1: 9, y1: 20, x2: 9, y2: 23 }],
    ['line', { x1: 15, y1: 20, x2: 15, y2: 23 }],
    ['line', { x1: 20, y1: 9, x2: 23, y2: 9 }],
    ['line', { x1: 20, y1: 14, x2: 23, y2: 14 }],
    ['line', { x1: 1, y1: 9, x2: 4, y2: 9 }],
    ['line', { x1: 1, y1: 14, x2: 4, y2: 14 }]
  ],
  'map-pin': [
    ['path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }],
    ['circle', { cx: 12, cy: 10, r: 3 }]
  ],
  hash: [
    ['line', { x1: 4, y1: 9, x2: 20, y2: 9 }],
    ['line', { x1: 4, y1: 15, x2: 20, y2: 15 }],
    ['line', { x1: 10, y1: 3, x2: 8, y2: 21 }],
    ['line', { x1: 16, y1: 3, x2: 14, y2: 21 }]
  ],
  calendar: [
    ['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }],
    ['line', { x1: 16, y1: 2, x2: 16, y2: 6 }],
    ['line', { x1: 8, y1: 2, x2: 8, y2: 6 }],
    ['line', { x1: 3, y1: 10, x2: 21, y2: 10 }]
  ],
  clipboard: [
    ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }],
    ['rect', { x: 8, y: 2, width: 8, height: 4, rx: 1 }],
    ['line', { x1: 9, y1: 12, x2: 15, y2: 12 }],
    ['line', { x1: 9, y1: 16, x2: 13, y2: 16 }]
  ],
  'arrow-left': [
    ['line', { x1: 19, y1: 12, x2: 5, y2: 12 }],
    ['polyline', { points: '12 19 5 12 12 5' }]
  ],
  'chevron-right': [['polyline', { points: '9 18 15 12 9 6' }]],
  inbox: [
    ['polyline', { points: '22 12 16 12 14 15 10 15 8 12 2 12' }],
    ['path', { d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }]
  ],
  flask: [
    ['path', { d: 'M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2' }],
    ['path', { d: 'M8.5 2h7' }],
    ['path', { d: 'M7 16h10' }]
  ],
  activity: [['polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }]],
  wrench: [
    ['path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' }]
  ],
  info: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 12, y1: 16, x2: 12, y2: 12 }],
    ['line', { x1: 12, y1: 8, x2: 12.01, y2: 8 }]
  ],
  filter: [['polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }]],
  plus: [
    ['line', { x1: 12, y1: 5, x2: 12, y2: 19 }],
    ['line', { x1: 5, y1: 12, x2: 19, y2: 12 }]
  ]
}

const nodes = computed(() => icons[props.name] ?? [])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-for="(node, index) in nodes" :key="index">
      <path v-if="node[0] === 'path'" v-bind="node[1]" />
      <circle v-else-if="node[0] === 'circle'" v-bind="node[1]" />
      <rect v-else-if="node[0] === 'rect'" v-bind="node[1]" />
      <line v-else-if="node[0] === 'line'" v-bind="node[1]" />
      <polyline v-else-if="node[0] === 'polyline'" v-bind="node[1]" />
      <polygon v-else-if="node[0] === 'polygon'" v-bind="node[1]" />
    </template>
  </svg>
</template>
