import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Device, Inspection
from app.seed import seed


@pytest.fixture
def seeded() -> None:
    seed(reset=True)


def _add_device(
    *,
    name: str = "测试设备",
    status: str = "normal",
    fault_status: str | None = None,
    fault_description: str | None = None,
) -> int:
    with SessionLocal() as db:
        device = Device(
            name=name,
            location="TEST-01",
            model="TEST-MODEL",
            status=status,
            fault_status=fault_status,
            fault_description=fault_description,
            last_inspection_at=None,
            created_at="2026-11-25T09:00:00+08:00",
            updated_at="2026-11-25T09:00:00+08:00",
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        return device.id


def _get_device(device_id: int) -> Device:
    with SessionLocal() as db:
        device = db.get(Device, device_id)
        assert device is not None
        db.expunge(device)
        return device


def _inspection_count() -> int:
    with SessionLocal() as db:
        return int(db.scalar(select(func.count()).select_from(Inspection)) or 0)


def test_device_list_empty(client: TestClient) -> None:
    response = client.get("/api/devices")

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_keyword_without_match_returns_empty_list(
    client: TestClient, seeded: None
) -> None:
    response = client.get("/api/devices", params={"keyword": "不存在的设备"})

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


@pytest.mark.parametrize(
    ("params", "message"),
    [
        ({"status": "broken"}, "status 必须是 normal 或 fault"),
        (
            {"fault_status": "in_progress"},
            "fault_status 必须是 pending、processing 或 resolved",
        ),
    ],
)
def test_invalid_device_filters_return_422(
    client: TestClient,
    params: dict[str, str],
    message: str,
) -> None:
    response = client.get("/api/devices", params=params)

    assert response.status_code == 422
    assert response.json() == {"detail": message}


def test_device_detail_not_found(client: TestClient) -> None:
    response = client.get("/api/devices/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "设备不存在"}


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (
            {"result": "normal", "note": "   "},
            "巡检备注不能为空",
        ),
        (
            {"result": "fault", "note": "结果值不合法"},
            "巡检结果必须是 normal 或 abnormal",
        ),
    ],
)
def test_invalid_inspection_payload_returns_422(
    client: TestClient,
    payload: dict[str, str],
    message: str,
) -> None:
    device_id = _add_device()

    response = client.post(
        f"/api/devices/{device_id}/inspections",
        json=payload,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": message}


def test_abnormal_inspection_creates_pending_fault(client: TestClient) -> None:
    device_id = _add_device()

    response = client.post(
        f"/api/devices/{device_id}/inspections",
        json={"result": "abnormal", "note": "电源指示灯不亮"},
    )

    assert response.status_code == 201
    device = _get_device(device_id)
    assert device.status == "fault"
    assert device.fault_status == "pending"
    assert device.fault_description == "电源指示灯不亮"


def test_abnormal_inspection_keeps_existing_pending_fault(
    client: TestClient,
) -> None:
    device_id = _add_device(
        status="fault",
        fault_status="pending",
        fault_description="原始故障描述",
    )

    response = client.post(
        f"/api/devices/{device_id}/inspections",
        json={"result": "abnormal", "note": "复测仍异常"},
    )

    assert response.status_code == 201
    device = _get_device(device_id)
    assert device.fault_status == "pending"
    assert device.fault_description == "原始故障描述"
    assert _inspection_count() == 1


def test_patch_invalid_fault_status_returns_422(client: TestClient) -> None:
    device_id = _add_device()

    response = client.patch(
        f"/api/devices/{device_id}/fault",
        json={"fault_status": "in_progress"},
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "fault_status 必须是 pending、processing 或 resolved"
    }


def test_patch_resolved_sets_device_normal(client: TestClient) -> None:
    device_id = _add_device(
        status="fault",
        fault_status="processing",
        fault_description="维修中",
    )

    response = client.patch(
        f"/api/devices/{device_id}/fault",
        json={"fault_status": "resolved"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fault_status"] == "resolved"
    assert payload["status"] == "normal"


def test_patch_resolved_without_active_fault_returns_400(
    client: TestClient,
) -> None:
    device_id = _add_device()

    response = client.patch(
        f"/api/devices/{device_id}/fault",
        json={"fault_status": "resolved"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "当前没有可解决的故障"}


def test_stats_match_seed_data(client: TestClient, seeded: None) -> None:
    response = client.get("/api/stats")

    assert response.status_code == 200
    assert response.json() == {
        "total_devices": 10,
        "normal_devices": 7,
        "fault_devices": 3,
        "pending_faults": 2,
        "processing_faults": 1,
        "resolved_faults": 1,
        "total_inspections": 14,
    }
