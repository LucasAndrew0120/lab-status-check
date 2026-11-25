# 后端启动与接口使用说明（成员 A）

> 适用范围：`backend/` 目录  
> 接口契约以仓库根目录 `docs/api.md`（v0.2）为准，本文件只说明如何启动、联调和验证。

## 1. 目录结构

```text
backend/
├─ requirements.txt
├─ app/
│  ├─ main.py              # FastAPI 入口，注册路由、CORS、异常处理
│  ├─ database.py          # SQLite 连接、会话、建表
│  ├─ models.py            # Device / Inspection ORM 模型
│  ├─ schemas.py           # 请求/响应模型与字段校验
│  ├─ enums.py             # 状态枚举
│  ├─ errors.py            # 422/500 统一为 {"detail": "字符串"}
│  ├─ utils.py             # 北京时间 ISO 时间
│  ├─ seed.py              # 示例数据脚本
│  └─ routers/
│     ├─ health.py         # GET /api/health
│     └─ devices.py        # 设备与巡检核心接口（A 负责）
└─ lab.db                  # 本地数据库，已被 .gitignore 忽略
```

## 2. 环境要求

- Python 3.10+（本机验证使用 3.14）
- 不需要 Node.js；前端由成员 B 的 Vite 项目独立启动

## 3. 安装与启动

在仓库根目录执行：

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.seed        # 首次启动前插入示例数据
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- 服务地址：`http://127.0.0.1:8000`
- Swagger 调试页：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/api/health`

重建示例数据（会清空设备与巡检记录）：

```powershell
.\.venv\Scripts\python.exe -m app.seed --reset
```

`seed.py` 插入 10 台设备、14 条巡检记录，分布为：

| 类型 | 数量 |
|---|---|
| `status=normal` | 7（其中 1 台 `fault_status=resolved`） |
| `fault_status=pending` | 2 |
| `fault_status=processing` | 1 |
| 巡检记录 | 14 |

## 4. 数据库配置

默认数据库文件为 `backend/lab.db`。通过环境变量覆盖：

```powershell
$env:LAB_DATABASE_URL = "sqlite:///C:/Users/你的用户名/AppData/Local/Temp/lab_test.db"
```

测试请指向临时数据库，测试结束后删除，不要提交 `*.db` 文件。

## 5. 成员 A 已完成的接口

| 方法 | 路径 | 状态 |
|---|---|---|
| GET | `/api/health` | ✅ |
| GET | `/api/devices`（`keyword` / `status` / `fault_status`） | ✅ |
| GET | `/api/devices/{device_id}` | ✅ |
| GET | `/api/devices/{device_id}/inspections` | ✅ |
| POST | `/api/devices/{device_id}/inspections` | ✅ |
| PATCH | `/api/devices/{device_id}/fault` | ✅ |
| GET | `/api/stats` | ✅ 成员 C 已实现 |

`GET /api/stats` 的实现位置：

1. `app/routers/stats.py` 按 `docs/api.md` 5.7 的口径聚合统计；
2. `app/main.py` 注册 `/api/stats`；
3. `app/schemas.py` 的 `StatsOut` 约束响应字段。

运行接口测试：

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
```

测试会自动创建临时 SQLite 数据库并在结束后删除，不会修改 `lab.db`。

## 6. 联调示例

以下示例假设已执行 `seed.py`。PowerShell 中 `curl` 是 `Invoke-WebRequest` 的别名，建议使用 `curl.exe`。

```powershell
# 设备列表：名称搜索 + 状态筛选（AND）
curl.exe "http://127.0.0.1:8000/api/devices?keyword=示波&status=normal"

# 查看设备 8（待处理故障）
curl.exe "http://127.0.0.1:8000/api/devices/8"

# 查看设备 1 的巡检记录（最新在前）
curl.exe "http://127.0.0.1:8000/api/devices/1/inspections"

# 登记巡检：normal
curl.exe -X POST "http://127.0.0.1:8000/api/devices/1/inspections" `
  -H "Content-Type: application/json" `
  -d '{"result":"normal","note":"运行正常，无异常声音"}'

# 登记巡检：abnormal，且设备当前无未解决故障时会自动变为 pending
curl.exe -X POST "http://127.0.0.1:8000/api/devices/1/inspections" `
  -H "Content-Type: application/json" `
  -d '{"result":"abnormal","note":"电源指示灯不亮"}'

# 更新故障状态：processing
curl.exe -X PATCH "http://127.0.0.1:8000/api/devices/8/fault" `
  -H "Content-Type: application/json" `
  -d '{"fault_status":"processing","fault_description":"已联系维修"}'

# 解决故障（没有待处理/处理中故障时返回 400）
curl.exe -X PATCH "http://127.0.0.1:8000/api/devices/8/fault" `
  -H "Content-Type: application/json" `
  -d '{"fault_status":"resolved"}'
```

前端通过 Vite 代理请求 `/api/...` 即可，无需关心 CORS；后端已额外放行 `127.0.0.1:5173` 和 `localhost:5173`。

## 7. 错误处理

- 所有错误统一为 `{"detail": "字符串"}`，前端直接展示 `detail`。
- 422 示例：

```json
{"detail": "巡检结果必须是 normal 或 abnormal"}
{"detail": "巡检备注不能为空"}
{"detail": "status 必须是 normal 或 fault"}
```

- 404：`{"detail": "设备不存在"}`
- 400：`{"detail": "当前没有可解决的故障"}`
- 时间字段统一为北京时间 ISO 8601，例如 `2026-11-24T10:00:00+08:00`。

## 8. 验证记录

已在临时数据库上对 A 负责的接口做冒烟验证，覆盖以下 32 项：

- 健康检查、列表默认排序、数量与 seed 一致
- `keyword` 搜索、全空格不过滤、无结果返回 200 空列表
- `status` / `fault_status` 单独筛选与 AND 组合
- 非法 `status` / `fault_status` 返回 422 字符串
- 设备详情、404
- 巡检列表倒序、新增巡检 201、列表刷新后新记录在最前
- `note` 全空格 / 超 500 字 / 缺失、非法巡检结果返回 422
- 缺少 `result`、缺少 `fault_status` 返回 422 中文提示
- 对不存在设备登记巡检返回 404
- `abnormal` 且无故障自动 `pending`；已有 `pending` 不重复创建、保留原描述
- 无故障时 `resolved` 返回 400
- `pending` → `processing` → `resolved` 状态流转，设备 `status` 同步
- `resolved` 后再次 `abnormal` 自动重新创建 `pending`
- 非法 `fault_status` 返回 422、不存在设备 PATCH 返回 404

成员 C 的 pytest 测试应使用临时数据库，并覆盖 `docs/api.md` 7.2 中的清单。
