"""请求 / 响应数据模型。"""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.enums import DeviceStatus, FaultStatus, InspectionResult

Note = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]

FaultDescription = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=500),
]


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: str
    model: str
    status: DeviceStatus
    fault_status: FaultStatus | None
    fault_description: str | None
    last_inspection_at: str | None
    created_at: str
    updated_at: str


class DeviceListOut(BaseModel):
    items: list[DeviceOut]
    total: int


class InspectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: int
    result: InspectionResult
    note: str
    created_at: str


class InspectionListOut(BaseModel):
    items: list[InspectionOut]
    total: int


class InspectionCreate(BaseModel):
    result: InspectionResult
    note: Note


class FaultUpdate(BaseModel):
    fault_status: FaultStatus
    fault_description: FaultDescription | None = Field(default=None)


class HealthOut(BaseModel):
    status: str


class StatsOut(BaseModel):
    total_devices: int
    normal_devices: int
    fault_devices: int
    pending_faults: int
    processing_faults: int
    resolved_faults: int
    total_inspections: int
