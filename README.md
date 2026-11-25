# LabPulse 实验室设备巡检与故障记录平台

一个用于实验室设备台账、巡检登记和故障处理的三人协作 Web 项目。后端使用 FastAPI + SQLite，前端使用 Vue 3 + Vite。

接口契约以 [`docs/api.md`](docs/api.md) v0.2 为准，后端启动说明见 [`docs/backend.md`](docs/backend.md)，前端说明见 [`frontend/README.md`](frontend/README.md)，验收与缺陷复验记录见 [`docs/acceptance.md`](docs/acceptance.md)。

## 1. 已实现功能

- 首页展示设备总数、正常设备数、活动故障设备数、待处理/处理中/已解决故障数和巡检总数。
- 按设备名称搜索，按设备状态和故障状态筛选，支持 AND 组合。
- 查看设备详情、当前故障和巡检记录。
- 登记正常或异常巡检；异常巡检可为无活动故障的设备自动创建待处理故障。
- 将故障更新为待处理、处理中或已解决，并同步设备状态。
- 页面覆盖加载中、空数据、成功、接口失败和重试状态。

## 2. 技术栈与目录

```text
lab-status-check/
├─ backend/
│  ├─ app/                 # FastAPI、SQLAlchemy、路由、示例数据
│  ├─ tests/               # pytest 接口测试（临时数据库）
│  ├─ requirements.txt     # 运行依赖
│  └─ requirements-dev.txt # 测试依赖
├─ frontend/
│  ├─ src/                 # Vue 页面、组件、接口封装
│  └─ package.json
├─ docs/
│  ├─ api.md               # 接口契约
│  ├─ backend.md           # 后端启动与联调说明
│  └─ acceptance.md        # 验收与缺陷复验记录
└─ README.md
```

环境要求：

- Python 3.10+
- Node.js 20.19+ 或 22.12+
- npm

Windows 上如果 `py` 命令不可用，可直接使用 `python`。

## 3. 启动后端

在仓库根目录执行：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

服务地址：

- API：<http://127.0.0.1:8000>
- Swagger：<http://127.0.0.1:8000/docs>
- 健康检查：<http://127.0.0.1:8000/api/health>

需要重建示例数据时，在 `backend` 目录执行：

```powershell
.\.venv\Scripts\python.exe -m app.seed --reset
```

该命令会清空本地设备和巡检数据。`backend/lab.db` 已被 `.gitignore` 忽略，不应提交。

## 4. 启动前端

另开一个终端：

```powershell
cd frontend
npm ci
npm run dev
```

打开 <http://localhost:5173>。Vite 会将 `/api` 代理到 `http://127.0.0.1:8000`。

没有后端时，可以启用前端内置 Mock：

```powershell
cd frontend
"VITE_USE_MOCK=true" | Set-Content .env.local
npm run dev
```

`.env.local` 不会提交。

## 5. 运行测试

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
```

测试覆盖 `docs/api.md` 7.2 的 13 个场景，包括空列表、搜索无结果、非法枚举、404、巡检校验、故障状态流转和统计口径。测试使用系统临时目录中的 SQLite 数据库，结束后自动删除。

构建前端：

```powershell
cd frontend
npm run build
```

## 6. 基本使用

1. 启动后端和前端，确认侧边栏显示「后端已连接」。
2. 在首页查看设备统计和故障处理队列。
3. 进入设备台账，按名称、设备状态或故障状态筛选。
4. 打开设备详情，登记巡检，或更新当前故障状态。
5. 提交异常巡检时，如果设备没有活动故障，系统会创建 `pending` 故障。
6. 标记故障已解决后，故障状态变为 `resolved`，设备状态恢复为 `normal`。

首页统计响应字段：

```json
{
  "total_devices": 10,
  "normal_devices": 7,
  "fault_devices": 3,
  "pending_faults": 2,
  "processing_faults": 1,
  "resolved_faults": 1,
  "total_inspections": 14
}
```

`fault_devices` 只统计 `pending` / `processing` 的设备，`resolved` 不计入活动故障。

## 7. 分支与交付状态

| 分支 | 内容 | 状态 |
|---|---|---|
| `feat/backend-core` | 后端核心与示例数据 | 已合并 |
| `feat/frontend-pages` | 前端页面与联调 | 已合并，PR #4 |
| `feat/search-tests` | 统计接口、测试、文档与验收 | PR #5 审核中 |

当前功能、测试和构建验证结果记录在 [`docs/acceptance.md`](docs/acceptance.md)。最终验收仍应以最新 `main` 上重新执行的测试和前端构建结果为准。
