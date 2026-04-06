from __future__ import annotations

from typing import Any


def _normalize_text(value: Any) -> str:
    return str(value).strip().lower() if value not in (None, "") else ""


def _normalize_year(value: Any) -> int | None:
    if value in (None, ""):
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def student_matches_access(user: dict | None, item: dict | None) -> bool:
    if not user or user.get("role") != "student" or not item:
        return True

    student_branch = _normalize_text(user.get("branch") or user.get("department"))
    student_course = _normalize_text(user.get("course"))
    student_year = _normalize_year(user.get("year"))
    student_section = _normalize_text(user.get("section"))

    allowed_branch = _normalize_text(item.get("branch"))
    allowed_course = _normalize_text(item.get("course"))
    allowed_year = _normalize_year(item.get("year"))
    allowed_section = _normalize_text(item.get("section"))

    if allowed_branch and allowed_branch != student_branch:
        return False
    if allowed_course and allowed_course != student_course:
        return False
    if allowed_year is not None and allowed_year != student_year:
        return False
    if allowed_section and allowed_section != student_section:
        return False

    return True


def student_access_clauses(user: dict | None) -> list[dict]:
    if not user or user.get("role") != "student":
        return []

    raw_values = [
        ("branch", user.get("branch") or user.get("department")),
        ("course", user.get("course")),
        ("year", user.get("year")),
        ("section", user.get("section")),
    ]

    clauses: list[dict] = []
    for field, value in raw_values:
        if value in (None, ""):
            continue
        clauses.append({
            "$or": [
                {field: {"$exists": False}},
                {field: None},
                {field: value},
            ]
        })

    return clauses