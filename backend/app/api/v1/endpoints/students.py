from fastapi import APIRouter, Depends, Query
from typing import Optional
from bson import ObjectId
from app.core.security import require_faculty, get_current_user
from app.db.mongodb import get_db

router = APIRouter()


@router.get("/")
async def list_students(
    department: Optional[str] = None,
    year: Optional[int] = None,
    course: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db=Depends(get_db),
    _=Depends(require_faculty),
):
    query = {}
    if department:
        query["department"] = department
    if year:
        query["year"] = year
    if course:
        query["course"] = course
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"student_id": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    students = await db.students.find(query, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.students.count_documents(query)

    for s in students:
        s["id"] = str(s.pop("_id"))

    return {"students": students, "total": total, "page": page, "limit": limit}


@router.get("/{student_id}/performance")
async def student_performance(student_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    student = await db.students.find_one({"_id": ObjectId(student_id)}, {"password_hash": 0})
    if not student:
        return {}

    code_subs = await db.code_submissions.count_documents({"student_id": student_id})
    accepted = await db.code_submissions.count_documents({"student_id": student_id, "status": "accepted"})
    apt_subs = await db.apt_submissions.count_documents({"student_id": student_id})

    leaderboard_entry = await db.leaderboard.find_one(
        {"student_id": student_id}, sort=[("score", -1)]
    )

    student["id"] = str(student.pop("_id"))
    return {
        "student": student,
        "code_submissions": code_subs,
        "accepted_solutions": accepted,
        "aptitude_tests_attempted": apt_subs,
        "best_score": leaderboard_entry.get("score") if leaderboard_entry else 0,
    }
