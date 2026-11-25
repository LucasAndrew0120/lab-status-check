"""示例数据脚本。

用法（在 backend 目录下）：
    python -m app.seed            # 空库时插入示例数据
    python -m app.seed --reset    # 清空设备/巡检数据后重新插入

数据分布（与 docs/api.md 7.1 对齐）：
    10 台设备：7 台 normal（其中 1 台故障已解决）、2 台 pending、1 台 processing
    14 条巡检记录
"""

import argparse

from sqlalchemy import delete, select

from app.database import SessionLocal, init_db
from app.models import Device, Inspection
from app.utils import BEIJING_TZ

# (name, location, model, status, fault_status, fault_description)
DEVICES: list[tuple[str, str, str, str, str | None, str | None]] = [
    ("示波器", "A101", "Tektronix TBS2000", "normal", None, None),
    ("信号发生器", "A101", "Keysight 33500B", "normal", None, None),
    ("数字万用表", "A102", "Fluke 87V", "normal", None, None),
    ("直流稳压电源", "A102", "Rigol DP832", "normal", None, None),
    ("频谱分析仪", "B201", "Rohde & Schwarz FPC1500", "normal", None, None),
    ("电子负载", "A103", "ITECH IT8511+", "normal", None, None),
    ("热成像仪", "B202", "FLIR E8", "normal", "resolved", "镜头校准偏差，已重新校准"),
    ("逻辑分析仪", "B201", "Saleae Logic Pro 16", "fault", "pending", "通道 3 无信号输出"),
    (
        "恒温培养箱",
        "C101",
        "ESPEC SH-241",
        "fault",
        "pending",
        "温度显示异常，实际温度与设定值偏差较大",
    ),
    ("高速离心机", "C102", "Eppendorf 5424", "fault", "processing", "运行时异响，已联系维修"),
]

# (device_index, result, note, created_at)
INSPECTIONS: list[tuple[int, str, str, str]] = [
    (1, "normal", "运行正常，波形清晰", "2026-11-20T09:30:00+08:00"),
    (1, "normal", "运行正常，无异常声音", "2026-11-24T10:00:00+08:00"),
    (2, "normal", "输出频率稳定", "2026-11-21T14:00:00+08:00"),
    (3, "normal", "测量读数与标准源一致", "2026-11-22T10:20:00+08:00"),
    (4, "normal", "电压输出正常，无漂移", "2026-11-19T16:10:00+08:00"),
    (5, "normal", "频谱扫描正常", "2026-11-18T11:00:00+08:00"),
    (5, "normal", "复测正常", "2026-11-23T09:50:00+08:00"),
    (6, "normal", "带载测试正常", "2026-11-17T15:30:00+08:00"),
    (7, "abnormal", "镜头成像存在校准偏差", "2026-11-15T10:00:00+08:00"),
    (7, "normal", "重新校准后成像正常", "2026-11-16T09:30:00+08:00"),
    (8, "abnormal", "通道 3 无信号输出", "2026-11-22T13:40:00+08:00"),
    (
        9,
        "abnormal",
        "温度显示异常，实际温度与设定值偏差较大",
        "2026-11-23T15:20:00+08:00",
    ),
    (10, "abnormal", "运行时异响", "2026-11-24T09:00:00+08:00"),
    (10, "abnormal", "更换轴承后仍有轻微异响", "2026-11-24T15:00:00+08:00"),
]


def _created_at(index: int) -> str:
    day = min(index, 24)
    return f"2026-11-{day:02d}T09:00:00+08:00"


def seed(reset: bool = False) -> None:
    init_db()

    with SessionLocal() as db:
        existing = db.scalar(select(Device.id).limit(1))
        if existing is not None and not reset:
            print("数据库已有设备数据，跳过 seed。如需重建请加 --reset")
            return

        if reset:
            db.execute(delete(Inspection))
            db.execute(delete(Device))
            db.commit()
            print("已清空原有设备与巡检数据")

        devices: list[Device] = []
        for index, (name, location, model, device_status, fault_status, description) in enumerate(
            DEVICES, start=1
        ):
            created_at = _created_at(index)
            devices.append(
                Device(
                    name=name,
                    location=location,
                    model=model,
                    status=device_status,
                    fault_status=fault_status,
                    fault_description=description,
                    last_inspection_at=None,
                    created_at=created_at,
                    updated_at=created_at,
                )
            )
        db.add_all(devices)
        db.flush()  # 取得自增 ID

        inspections: list[Inspection] = []
        for device_index, result, note, created_at in INSPECTIONS:
            device = devices[device_index - 1]
            inspections.append(
                Inspection(
                    device_id=device.id,
                    result=result,
                    note=note,
                    created_at=created_at,
                )
            )
            if device.last_inspection_at is None or created_at > device.last_inspection_at:
                device.last_inspection_at = created_at
                device.updated_at = created_at

        db.add_all(inspections)
        db.commit()

        print(f"seed 完成：设备 {len(devices)} 台，巡检记录 {len(inspections)} 条")
        print("可访问 http://127.0.0.1:8000/docs 查看并调试接口")
        print(f"时区：{BEIJING_TZ}")


def main() -> None:
    parser = argparse.ArgumentParser(description="插入实验室设备示例数据")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="清空现有设备与巡检数据后重新插入（谨慎使用）",
    )
    args = parser.parse_args()
    seed(reset=args.reset)


if __name__ == "__main__":
    main()
