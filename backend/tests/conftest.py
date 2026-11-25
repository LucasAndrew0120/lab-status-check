import os
import shutil
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

# 必须在导入 app.database 前设置，确保整个测试会话只使用临时数据库。
TEST_DB_DIR = Path(tempfile.mkdtemp(prefix="lab_status_check_tests_"))
TEST_DB_PATH = TEST_DB_DIR / "test.db"
os.environ["LAB_DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

from app.database import SessionLocal, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Device, Inspection  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    init_db()
    with SessionLocal() as db:
        db.execute(delete(Inspection))
        db.execute(delete(Device))
        db.commit()
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    engine.dispose()
    shutil.rmtree(TEST_DB_DIR, ignore_errors=True)
