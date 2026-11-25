# 集成验收与联调缺陷复验记录

> 验收日期：2026-11-25
> 验收范围：`main` 已合并的后端核心、PR #4 前端，以及 PR #5 的统计与测试补充。
> 接口契约：[`api.md`](api.md) v0.2。

## 1. 验证环境

| 项目 | 环境 |
|---|---|
| 操作系统 | Windows |
| Python | 3.12.10 |
| Node.js | 24.18.0 |
| 后端依赖 | 项目内 `.venv` |
| 数据库 | pytest 临时 SQLite；冒烟使用系统临时 SQLite |
| 分支 | `feat/search-tests`（PR #5） |

## 2. PR #4 前端审查

审查提交：`55b3996 feat(frontend): 完成设备巡检平台前端与后端联调`
合并提交：`4b21e21 Merge pull request #4 ...`

| 审查项 | 结果 | 说明 |
|---|---|---|
| 接口字段 | 通过 | `Device`、`Inspection`、`Stats` 字段名与 `docs/api.md` 一致 |
| 设备搜索与筛选 | 通过 | `keyword` / `status` / `fault_status` 参数和空值处理一致 |
| 巡检异常流转 | 通过 | 异常巡检后刷新详情和记录，自动 `pending` 逻辑由后端负责 |
| 故障状态流转 | 通过 | `pending -> processing -> resolved` 请求字段正确，解决后设备恢复 `normal` |
| 错误处理 | 通过 | 统一读取字符串 `detail`，同时兼容默认数组 `detail` |
| 页面状态 | 通过 | 已覆盖加载、空数据、错误重试和成功提示 |
| 前端构建 | 通过 | `npm run build` 成功，无构建错误 |

审查结论：未发现阻断合并的问题。PR #4 已合并到 `main`。

## 3. 接口测试结果

测试命令：

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

结果：`13 passed`。测试数据库位于系统临时目录，测试会话结束后删除。

| 覆盖项 | 结果 |
|---|---|
| 设备列表空数据 | 通过 |
| keyword 搜索无结果返回 200 空列表 | 通过 |
| 非法 status 返回 422 | 通过 |
| 非法 fault_status 返回 422 | 通过 |
| 设备详情 404 | 通过 |
| 新增巡检 note 为空返回 422 | 通过 |
| 新增巡检 result 非法返回 422 | 通过 |
| abnormal 且无故障自动 pending | 通过 |
| abnormal 且已有 pending 不重复创建 | 通过 |
| PATCH 非法 fault_status 返回 422 | 通过 |
| PATCH resolved 后设备 status 为 normal | 通过 |
| 无故障时 PATCH resolved 返回 400 | 通过 |
| 统计数字与 seed 数据一致 | 通过 |

## 4. 统计接口冒烟

使用临时数据库执行 seed 后请求 `GET /api/stats`：

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

确认 `fault_devices` 仅包含 `pending` / `processing`，已解决的 1 台设备未计入活动故障。

真实服务联调：

| 检查项 | 结果 |
|---|---|
| `GET http://127.0.0.1:8000/api/health` | 200，`status=ok` |
| `GET http://127.0.0.1:8000/api/stats` | 200，统计字段完整 |
| `GET http://127.0.0.1:5173/` | 200，页面标题正确 |
| `GET http://127.0.0.1:5173/api/stats` | 200，Vite 代理返回与后端一致 |

## 5. 联调缺陷与复验

| 编号 | 现象 | 复现步骤 | 期望结果 | 处理与复验 |
|---|---|---|---|---|
| D-001 | `GET /api/stats` 返回 404，首页使用临时汇总 | 启动后端后请求 `/api/stats` | 返回 200 和 7 个统计字段 | 已新增统计路由与 `StatsOut`；接口测试及临时数据库冒烟均返回 200 |
| D-002 | `seed.py` 注释写 15 条巡检，实际 seed 为 14 条 | 对比 `INSPECTIONS` 数量与脚本注释 | 文档和实际数据一致 | 已改为 14 条，统计测试按 14 条校验通过 |

前端在 `/api/stats` 尚不存在时会自动使用设备与巡检接口汇总，正式接口上线后优先使用正式接口。该降级仍作为旧后端兼容逻辑保留，但当前 `main` 正常联调不会触发。

## 6. 验收结论

- `GET /api/stats` 已实现，统计口径符合 `docs/api.md` 5.7。
- `docs/api.md` 7.2 的 13 项接口测试全部通过。
- PR #4 的接口字段、状态流转和错误处理审查通过。
- 前端生产构建通过。
- 根目录 README 已汇总安装、启动、测试和基本使用说明。
- 最终合并后仍需在最新 `main` 上重新运行测试和前端构建，并完成团队成员 PR 评审记录。
