# LabPulse · 实验室设备巡检平台（前端）

对应仓库接口文档 [`../docs/api.md`](../docs/api.md) v0.2，技术栈为 **Vue 3 + Vite + Vue Router**，不引入 UI 组件库，样式在 `src/styles/main.css` 中维护。

## 1. 功能范围

- **总览页**：设备总数、正常设备、故障设备、待处理故障、故障处理队列、健康度、巡检记录总数
- **设备台账**：名称搜索、设备状态筛选、故障状态筛选、AND 组合、空结果提示
- **设备详情**：设备档案、当前故障、故障处理、巡检记录时间线
- **登记巡检**：正常 / 异常结果、备注 1–500 字校验、提交后刷新设备与记录
- **故障处理**：待处理 / 处理中 / 已解决流转，解决前二次确认
- **页面状态**：骨架屏、空状态、错误重试、操作成功 Toast、后端连接状态
- **地址栏同步**：搜索与筛选条件写入 query，刷新或分享链接后仍保留

## 2. 启动

### 2.1 先启动后端

按 [`../docs/backend.md`](../docs/backend.md) 的说明操作（在仓库根目录）：

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

后端地址：`http://127.0.0.1:8000`，Swagger：`http://127.0.0.1:8000/docs`。

### 2.2 启动前端

另开一个终端：

```powershell
cd frontend
npm install
npm run dev
```

打开 <http://localhost:5173>。

前端默认连接真实后端，通过 Vite 代理请求 `/api`：

```js
// vite.config.js
server: {
  port: 5173,
  strictPort: true,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true
    }
  }
}
```

左侧栏底部显示「后端已连接」即代表 `/api/health` 正常。

### 2.3 无后端时使用 Mock

```powershell
cd frontend
"VITE_USE_MOCK=true" | Set-Content .env.local
npm run dev
```

也可以参考 `.env.example` 创建 `.env.local`。Mock 实现位于 `src/api/mock.js`，内置 10 台设备与 26 条巡检记录；刷新页面后恢复初始数据。`.env.local` 不会提交。

## 3. 接口对应关系

| 页面 / 操作 | 接口 | 状态 |
|---|---|---|
| 后端在线检查 | `GET /api/health` | 已接入 |
| 首页统计卡片 | `GET /api/stats` | 已接入，正式统计接口 |
| 首页故障队列 | `GET /api/devices?status=fault` | 已接入 |
| 设备台账 / 搜索 / 筛选 | `GET /api/devices?...` | 已接入 |
| 设备详情 | `GET /api/devices/{id}` | 已接入 |
| 巡检记录列表 | `GET /api/devices/{id}/inspections` | 已接入 |
| 提交巡检 | `POST /api/devices/{id}/inspections` | 已接入 |
| 更新故障状态 | `PATCH /api/devices/{id}/fault` | 已接入 |

实际联调注意事项：

- 后端所有错误都返回字符串 `detail`，前端直接展示；同时兼容 FastAPI 默认的数组 `detail`。
- 后端时间为北京时间 ISO 8601（`+08:00`），前端按浏览器本地时区格式化。
- `status` 与 `fault_status` 同时传入时由后端按 AND 组合。
- 巡检提交成功后，前端按文档建议重新请求设备详情和巡检列表。
- 提交异常巡检时，设备无活动故障会自动变为 `pending`；已有活动故障时保留原状态和描述。

## 4. `/api/stats` 兼容处理

后端现已提供 `GET /api/stats`，首页默认使用正式统计接口。

前端 `src/api/index.js` 仍保留旧后端的兼容降级：

1. 优先请求 `GET /api/stats`；
2. 如果该接口返回 404，则用 `GET /api/devices` 和每台设备的 `GET /api/devices/{id}/inspections` 即时汇总；
3. 统计口径与 `docs/api.md` 5.7 一致；
4. 此时首页健康度卡片底部会显示旧后端统计降级提示；
5. C 实现统计接口后，前端会自动切回正式接口，页面代码无需修改。

> 该降级只在 404 时触发；后端服务异常等其它错误仍会正常显示错误状态，不会掩盖问题。当前 `main` 已接入正式接口，正常联调不会触发降级。

## 5. 页面状态与错误处理

| 场景 | 页面反馈 |
|---|---|
| 列表 / 详情加载中 | 骨架屏 / 加载提示 |
| 搜索、筛选无结果 | 空状态 + 清除筛选 |
| 首页无故障 | 「全部设备运行正常」 |
| 备注为空或超长 | 表单内联错误，不发送请求 |
| 422 / 404 / 400 | 展示后端 `detail`，Toast + 表单内联提示 |
| 后端未启动 / 超时 | 明确提示检查后端，并提供重试 |
| 提交巡检 / 更新故障成功 | Toast 提示并刷新数据 |

## 6. 目录结构

```text
frontend/
├─ index.html
├─ vite.config.js           # 5173 端口 + /api 代理
├─ .env.example
├─ public/
│  ├─ favicon.svg
│  └─ robots.txt
└─ src/
   ├─ main.js
   ├─ App.vue               # 侧边栏、健康检查、全局 Toast
   ├─ api/
   │  ├─ http.js            # fetch 封装、超时、统一错误
   │  ├─ real.js            # 真实接口
   │  ├─ mock.js            # 可选 Mock 数据
   │  └─ index.js           # 模式切换 + 首页统计降级
   ├─ router/index.js
   ├─ views/
   │  ├─ DashboardView.vue
   │  ├─ DeviceListView.vue
   │  └─ DeviceDetailView.vue
   ├─ components/
   ├─ composables/useToast.js
   ├─ utils/
   └─ styles/main.css
```

## 7. 联调验证清单

- [ ] 首页 4 张统计卡片与 seed 数据一致（10 台设备、3 台活动故障、2 台待处理）
- [ ] 首页故障队列只显示 `pending` / `processing` 设备
- [ ] 名称搜索、设备状态、故障状态单项与组合筛选均正确
- [ ] 无结果时显示空状态，清除筛选后恢复
- [ ] 设备详情显示故障描述、状态和巡检记录（最新在前）
- [ ] 提交正常巡检：新增记录，最近巡检时间更新，故障状态不变
- [ ] 提交异常巡检且设备无活动故障：自动创建 `pending` 故障
- [ ] 已有 `pending` / `processing` 故障时提交异常巡检：不重复创建
- [ ] 「开始处理」更新为 `processing`；「标记已解决」确认后设备恢复正常
- [ ] 无活动故障时「已解决」不可选，接口 400 也有错误提示
- [ ] 访问不存在的设备 ID 显示「设备不存在」并可返回列表
- [ ] 直接访问 `/devices?status=fault&fault_status=pending` 筛选条件生效
- [ ] 后端未启动时显示「后端未连接」、错误卡片和重试入口

## 8. 构建

```powershell
cd frontend
npm run build
npm run preview
```

开发环境默认连接 `127.0.0.1:8000`；如果后端部署地址不同，修改 `vite.config.js` 的代理目标，或设置 `VITE_API_BASE`。静态部署时需要在 Web 服务器把 `/api` 反向代理到 FastAPI。
