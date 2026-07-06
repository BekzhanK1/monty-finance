import json
import threading
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

_lock = threading.Lock()
LOG_DIR = Path(__file__).resolve().parents[3] / "log" / "siri"


def _log_file_path() -> Path:
    day = datetime.now().strftime("%Y-%m-%d")
    return LOG_DIR / f"{day}.txt"


def _format_fields(fields: dict[str, Any]) -> str:
    if not fields:
        return ""
    payload = json.dumps(fields, ensure_ascii=False, indent=2, default=str)
    indented = "\n".join(f"  {line}" for line in payload.splitlines())
    return f"\n{indented}"


def append_siri_log(message: str, **fields: Any) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}{_format_fields(fields)}"

    with _lock:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with _log_file_path().open("a", encoding="utf-8") as log_file:
            log_file.write(line + "\n\n")


class SiriLog:
    def __init__(self) -> None:
        self.request_id = uuid.uuid4().hex[:8]

    def info(self, message: str, **fields: Any) -> None:
        append_siri_log(f"[req={self.request_id}] {message}", **fields)

    def error(self, message: str, exc: BaseException | None = None, **fields: Any) -> None:
        if exc is not None:
            fields = {
                **fields,
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }
        append_siri_log(f"[req={self.request_id}] ERROR {message}", **fields)
