"""
Data Export — Excel/CSV for admin/faculty
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
import pandas as pd
import io

from app.core.security import get_current_user
from app.db.mongodb import get_db

router = APIRouter()


@router.get("/students")
async def export_students(
    department: str = None,
    year: int = None,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("admin", "faculty"):
        from fastapi import HTTPException
        raise HTTPException(403, "Forbidden")

    query = {}
    if department:
        query["department"] = department
    if year:
        query["year"] = year

    cursor = db.students.find(query, {"password_hash": 0})
    students = await cursor.to_list(5000)

    rows = []
    for s in students:
        rows.append({
            "RegNo": s.get("student_id", ""),
            "Name": s.get("name", ""),
            "Department": s.get("department", ""),
            "Section": s.get("section", ""),
            "Course": s.get("course", ""),
            "Year": s.get("year", ""),
            "Email": s.get("profile", {}).get("email", ""),
            "Phone": s.get("profile", {}).get("phone", ""),
            "Status": "Active" if s.get("is_active", True) else "Inactive",
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, sheet_name="Students")
    buf.seek(0)

    filename = f"students_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/results")
async def export_results(
    test_id: str = None,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] not in ("admin", "faculty"):
        from fastapi import HTTPException
        raise HTTPException(403, "Forbidden")

    query = {"type": "test"}
    if test_id:
        query["test_id"] = test_id

    cursor = db.submissions.find(query)
    subs = await cursor.to_list(10000)

    rows = []
    for s in subs:
        rows.append({
            "StudentID": s.get("student_id", ""),
            "TestID": s.get("test_id", ""),
            "Score": s.get("score", 0),
            "Mode": s.get("mode", ""),
            "SubmittedAt": s.get("submitted_at", ""),
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, sheet_name="Results")
    buf.seek(0)

    filename = f"results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/login-history")
async def export_login_history(
    role: str = None,
    department: str = None,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if user["role"] != "admin":
        from fastapi import HTTPException
        raise HTTPException(403, "Forbidden")

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
    if start_date or end_date:
        query['login_at'] = {}
        if start_date:
            query['login_at']['$gte'] = datetime.fromisoformat(start_date)
        if end_date:
            query['login_at']['$lte'] = datetime.fromisoformat(end_date) + pd.Timedelta(days=1)

    cursor = db.login_history.find(query).sort('login_at', -1)
    rows_data = await cursor.to_list(5000)

    rows = []
    for item in rows_data:
        rows.append({
            'LoginAt': item.get('login_at', ''),
            'Role': item.get('role', ''),
            'Name': item.get('user_name', ''),
            'Identifier': item.get('identifier', ''),
            'Department': item.get('department', ''),
            'Course': item.get('course', ''),
            'Year': item.get('year', ''),
            'Active': 'Active' if item.get('is_active', True) else 'Inactive',
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, sheet_name="LoginHistory")
    buf.seek(0)

    filename = f"login_history_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
