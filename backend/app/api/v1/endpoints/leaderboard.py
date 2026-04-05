"""Leaderboard endpoints."""
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from typing import Optional
from bson import ObjectId

from app.core.security import get_current_user
from app.db.mongodb import get_db

router = APIRouter()


def _section_sort_key(item: dict):
    return (item.get("section_type") or "", item.get("name") or "", item.get("id") or "")


def _test_sort_key(item: dict):
    return (item.get("section_type") or "", item.get("name") or "", item.get("id") or "")


@router.get("/")
async def get_leaderboard(
    section_type: Optional[str] = None,
    section_id: Optional[str] = None,
    test_id: Optional[str] = None,
    section: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[int] = None,
    page: int = 1,
    limit: int = 50,
    db=Depends(get_db),
    _=Depends(get_current_user),
):
    match = {}
    if section_type and section_type != "all":
        match["section_type"] = section_type
    if section_id and section_id != "all":
        match["section_id"] = section_id
    if test_id and test_id != "all":
        match["test_id"] = test_id
    if section and section != "all":
        match["$or"] = [
            {"section_name": section},
            {"section_id": section},
            {"section": section},
            {"section_type": section},
        ]

    docs = await db.leaderboard.find(
        match,
        {
            "student_id": 1,
            "score": 1,
            "section_type": 1,
            "section_id": 1,
            "section_name": 1,
            "test_id": 1,
            "test_name": 1,
            "section": 1,
            "problem_id": 1,
        },
    ).to_list(5000)

    section_options = {}
    test_options = {}
    section_types = set()
    totals = defaultdict(float)

    for doc in docs:
        doc_section_type = doc.get("section_type") or doc.get("section") or "unknown"
        section_types.add(doc_section_type)

        section_value = doc.get("section_id") or doc.get("section_name") or doc.get("section")
        if section_value:
            key = str(section_value)
            section_options[key] = {
                "id": key,
                "name": doc.get("section_name") or doc.get("section") or key,
                "section_type": doc_section_type,
            }

        test_value = doc.get("test_id") or doc.get("problem_id") or doc.get("test_name")
        if test_value:
            key = str(test_value)
            test_options[key] = {
                "id": key,
                "name": doc.get("test_name") or key,
                "section_id": doc.get("section_id"),
                "section_type": doc_section_type,
            }

        student_id = doc.get("student_id")
        if student_id:
            totals[str(student_id)] += float(doc.get("score") or 0)

    student_object_ids = [ObjectId(student_id) for student_id in totals.keys() if ObjectId.is_valid(student_id)]
    students = await db.students.find(
        {"_id": {"$in": student_object_ids}},
        {"name": 1, "department": 1, "year": 1, "student_id": 1, "section": 1},
    ).to_list(len(student_object_ids))
    student_map = {str(student["_id"]): student for student in students}

    rows = []
    for student_id, total_score in totals.items():
        student = student_map.get(student_id)
        if not student:
            continue
        if department and department != "all" and student.get("department") != department:
            continue
        if year and student.get("year") != year:
            continue

        rows.append({
            "student_id": student.get("student_id", ""),
            "name": student.get("name", ""),
            "department": student.get("department", ""),
            "year": student.get("year", 0),
            "score": round(total_score, 2),
            "section": student.get("section", ""),
        })

    rows.sort(key=lambda row: (-row["score"], row["name"]))

    total = len(rows)
    start = (page - 1) * limit
    paged_rows = rows[start:start + limit]

    entries = []
    for rank, row in enumerate(paged_rows, start=start + 1):
        entries.append({
            "rank": rank,
            "student_id": row["student_id"],
            "name": row["name"],
            "department": row["department"],
            "year": row["year"],
            "score": row["score"],
            "section": row["section"],
        })

    sections = sorted(section_options.values(), key=_section_sort_key)
    tests = sorted(test_options.values(), key=_test_sort_key)

    return {
        "leaderboard": entries,
        "page": page,
        "total": total,
        "sections": sections,
        "tests": tests,
        "section_types": sorted(section_types),
    }
