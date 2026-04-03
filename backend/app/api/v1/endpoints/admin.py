from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
from datetime import timedelta
import pandas as pd
import io

from app.core.security import require_admin, hash_password
from app.db.mongodb import get_db
from app.models.schemas import AdminCreate, FacultyCreate, StudentCreate, BulkUploadResponse
from app.core.config import settings
from bson import ObjectId

router = APIRouter()


def _parse_dt(value: Optional[str]):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(400, f"Invalid date value: {value}")
    return parsed


# ─── Analytics ───────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(db=Depends(get_db), _=Depends(require_admin)):
    total_students = await db.students.count_documents({})
    total_faculty = await db.faculty.count_documents({})
    total_tests = await db.tests.count_documents({})
    total_problems = await db.coding_problems.count_documents({})
    active_competitions = await db.competitions.count_documents({
        "is_active": True,
        "end_time": {"$gte": datetime.utcnow()},
    })
    total_submissions = await db.code_submissions.count_documents({})
    total_logins = await db.login_history.count_documents({})

    login_trend_pipeline = [
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$login_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    login_trend = await db.login_history.aggregate(login_trend_pipeline).to_list(90)

    # Department-wise breakdown
    dept_pipeline = [
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    dept_stats = await db.students.aggregate(dept_pipeline).to_list(100)

    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_tests": total_tests,
        "total_problems": total_problems,
        "active_competitions": active_competitions,
        "total_submissions": total_submissions,
        "total_logins": total_logins,
        "login_trend": login_trend,
        "department_breakdown": dept_stats,
    }


@router.get("/login-history")
async def get_login_history(
    role: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    db=Depends(get_db),
    _=Depends(require_admin),
):
    query = {}
    if role and role != 'all':
        query['role'] = role
    if department and department != 'all':
        query['department'] = department
    if search:
        query['$or'] = [
            {'user_name': {'$regex': search, '$options': 'i'}},
            {'identifier': {'$regex': search, '$options': 'i'}},
            {'user_id': {'$regex': search, '$options': 'i'}},
        ]

    start_dt = _parse_dt(start_date)
    end_dt = _parse_dt(end_date)
    if start_dt or end_dt:
        query['login_at'] = {}
        if start_dt:
            query['login_at']['$gte'] = start_dt
        if end_dt:
            query['login_at']['$lte'] = end_dt + timedelta(days=1)

    skip = (page - 1) * limit
    cursor = db.login_history.find(query).sort('login_at', -1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    for item in items:
        item['id'] = str(item.pop('_id'))

    total = await db.login_history.count_documents(query)
    unique_users = await db.login_history.distinct('user_id', query)

    summary_pipeline = [
        {'$match': query},
        {'$group': {'_id': '$role', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
    ]
    role_breakdown = await db.login_history.aggregate(summary_pipeline).to_list(10)

    dept_pipeline = [
        {'$match': query},
        {'$group': {'_id': {'$ifNull': ['$department', 'Unknown']}, 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
    ]
    department_breakdown = await db.login_history.aggregate(dept_pipeline).to_list(20)

    trend_pipeline = [
        {'$match': query},
        {'$group': {'_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$login_at'}}, 'count': {'$sum': 1}}},
        {'$sort': {'_id': 1}},
    ]
    daily_breakdown = await db.login_history.aggregate(trend_pipeline).to_list(90)

    return {
        'items': items,
        'total': total,
        'page': page,
        'limit': limit,
        'unique_users': len(unique_users),
        'role_breakdown': role_breakdown,
        'department_breakdown': department_breakdown,
        'daily_breakdown': daily_breakdown,
    }


# ─── User Listing & Search ───────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    role: str = Query("student"),
    department: Optional[str] = None,
    year: Optional[int] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db=Depends(get_db),
    _=Depends(require_admin),
):
    coll_map = {"admin": "admins", "faculty": "faculty", "student": "students"}
    coll = coll_map.get(role, "students")

    query = {}
    if department:
        query["department"] = department
    if year and role == "student":
        query["year"] = year
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {f"{role}_id": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    cursor = db[coll].find(query, {"password_hash": 0}).skip(skip).limit(limit)
    users = await cursor.to_list(limit)

    for u in users:
        u["id"] = str(u.pop("_id"))

    total = await db[coll].count_documents(query)

    return {"users": users, "total": total, "page": page, "limit": limit}


# ─── Toggle Account ───────────────────────────────────────────────────────────

@router.patch("/users/{role}/{user_id}/toggle")
async def toggle_account(role: str, user_id: str, db=Depends(get_db), _=Depends(require_admin)):
    coll_map = {"admin": "admins", "faculty": "faculty", "student": "students"}
    coll = coll_map.get(role)
    if not coll:
        raise HTTPException(400, "Invalid role")

    user = await db[coll].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found")

    new_status = not user.get("is_active", True)
    await db[coll].update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}


# ─── Reset Password ───────────────────────────────────────────────────────────

@router.patch("/users/{role}/{user_id}/reset-password")
async def reset_password(
    role: str, user_id: str, new_password: str, db=Depends(get_db), _=Depends(require_admin)
):
    coll_map = {"admin": "admins", "faculty": "faculty", "student": "students"}
    coll = coll_map.get(role)
    if not coll:
        raise HTTPException(400, "Invalid role")

    await db[coll].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password_hash": hash_password(new_password)}},
    )
    return {"message": "Password reset successful"}


# ─── Delete User ──────────────────────────────────────────────────────────────

@router.delete("/users/{role}/{user_id}")
async def delete_user(role: str, user_id: str, db=Depends(get_db), _=Depends(require_admin)):
    coll_map = {"admin": "admins", "faculty": "faculty", "student": "students"}
    coll = coll_map.get(role)
    if not coll:
        raise HTTPException(400, "Invalid role")

    result = await db[coll].delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": "User deleted"}


# ─── Bulk Upload ──────────────────────────────────────────────────────────────

@router.post("/bulk-upload/{role}", response_model=BulkUploadResponse)
async def bulk_upload(
    role: str,
    file: UploadFile = File(...),
    db=Depends(get_db),
    _=Depends(require_admin),
):
    if role not in ("admin", "faculty", "student"):
        raise HTTPException(400, "Invalid role")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Invalid Excel file: {e}")

    if len(df) > settings.MAX_BULK_UPLOAD_USERS:
        raise HTTPException(400, f"Max {settings.MAX_BULK_UPLOAD_USERS} users per upload")

    coll_map = {"admin": "admins", "faculty": "faculty", "student": "students"}
    id_field_map = {"admin": "admin_id", "faculty": "faculty_id", "student": "student_id"}
    coll = coll_map[role]
    id_field = id_field_map[role]

    created, skipped, errors = 0, 0, []

    for idx, row in df.iterrows():
        try:
            row_dict = row.to_dict()
            user_id = str(row_dict.get(id_field, "")).strip()
            if not user_id:
                errors.append({"row": idx + 2, "error": "Missing ID"})
                continue

            existing = await db[coll].find_one({id_field: user_id})
            if existing:
                skipped += 1
                continue

            password = str(row_dict.get("password", "Welcome@123"))
            doc = {
                **{k: str(v).strip() for k, v in row_dict.items() if k != "password"},
                "password_hash": hash_password(password),
                "is_active": True,
                "created_at": datetime.utcnow(),
            }

            if role == "student":
                doc["profile"] = {}
                doc["stats"] = {"total_score": 0, "problems_solved": 0, "tests_attempted": 0}

            await db[coll].insert_one(doc)
            created += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})

    return BulkUploadResponse(
        total=len(df), created=created, skipped=skipped, errors=errors
    )


# ─── Download Template ────────────────────────────────────────────────────────

@router.get("/bulk-upload/{role}/template")
async def download_template(role: str, _=Depends(require_admin)):
    templates = {
        "admin": ["name", "designation", "department", "contact_number", "email", "admin_id", "password"],
        "faculty": ["name", "designation", "department", "contact_number", "email", "faculty_id", "password"],
        "student": ["name", "course", "year", "department", "section", "student_id", "password"],
    }

    if role not in templates:
        raise HTTPException(400, "Invalid role")

    df = pd.DataFrame(columns=templates[role])
    output = io.BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={role}_template.xlsx"},
    )
