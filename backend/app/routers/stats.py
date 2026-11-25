"""首页统计接口（成员 C 负责）。

对应 docs/api.md 5.7：MVP 每台设备只有一条当前故障记录，
因此故障设备数和各故障状态数均直接按设备字段统计。
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import ACTIVE_FAULT_STATUSES
from app.models import Device, Inspection
from app.schemas import StatsOut

router = APIRouter(tags=["stats"])


def _count(db: Session, model: type[Device] | type[Inspection], *criteria) -> int:
    stmt = select(func.count()).select_from(model)
    if criteria:
        stmt = stmt.where(*criteria)
    return int(db.scalar(stmt) or 0)


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)) -> StatsOut:
    return StatsOut(
        total_devices=_count(db, Device),
        normal_devices=_count(db, Device, Device.status == "normal"),
        fault_devices=_count(
            db,
            Device,
            Device.fault_status.in_(ACTIVE_FAULT_STATUSES),
        ),
        pending_faults=_count(db, Device, Device.fault_status == "pending"),
        processing_faults=_count(db, Device, Device.fault_status == "processing"),
        resolved_faults=_count(db, Device, Device.fault_status == "resolved"),
        total_inspections=_count(db, Inspection),
    )
