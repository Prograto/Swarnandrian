from collections.abc import Sequence
from io import BytesIO
from typing import Any

import pandas as pd
from fastapi.responses import StreamingResponse


QUESTION_TEMPLATE_COLUMNS = [
    "question_type",
    "question_text",
    "options",
    "correct_options",
    "correct_answer",
    "explanation",
    "marks",
    "negative_marks",
    "difficulty",
    "image_url",
    "branch",
    "is_active",
]

EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def build_excel_template(columns: Sequence[str], filename: str, sheet_name: str = "Template") -> StreamingResponse:
    df = pd.DataFrame(columns=list(columns))
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name=sheet_name)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def cell_text(value: Any, default: str | None = None) -> str | None:
    if pd.isna(value):
        return default

    if isinstance(value, str):
        text = value.strip()
        if not text or text.lower() in {"nan", "none"}:
            return default
        return text

    if value is None:
        return default

    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return default
    return text


def cell_int(value: Any, default: int = 0) -> int:
    text = cell_text(value)
    if text is None:
        return default

    try:
        return int(float(text))
    except (TypeError, ValueError):
        return default


def cell_float(value: Any, default: float = 0.0) -> float:
    text = cell_text(value)
    if text is None:
        return default

    try:
        return float(text)
    except (TypeError, ValueError):
        return default


def cell_bool(value: Any, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)) and not pd.isna(value):
        if value == 1:
            return True
        if value == 0:
            return False

    text = cell_text(value)
    if text is None:
        return default

    normalized = text.lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    return default


def split_pipe_values(value: Any) -> list[str] | None:
    text = cell_text(value)
    if text is None:
        return None

    values = [part.strip() for part in text.split("|") if part.strip()]
    return values or None


def split_csv_ints(value: Any) -> list[int] | None:
    text = cell_text(value)
    if text is None:
        return None

    values: list[int] = []
    for part in text.split(","):
        item = part.strip()
        if not item:
            continue
        try:
            values.append(int(float(item)))
        except (TypeError, ValueError):
            continue

    return values or None