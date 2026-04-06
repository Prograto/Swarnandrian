from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from bson import ObjectId
from app.core.security import require_faculty, require_admin, get_current_user
from app.db.mongodb import get_db
from app.core.security import hash_password
from app.services.s3_service import upload_to_s3
from datetime import datetime, timedelta
import io
import pandas as pd

router = APIRouter()


def _valid_object_ids(values):
    return [ObjectId(str(value)) for value in values if value and ObjectId.is_valid(str(value))]


async def _load_student_map(db, student_ids):
    ids = _valid_object_ids(student_ids)
    if not ids:
        return {}
    students = await db.students.find(
        {"_id": {"$in": ids}},
        {"name": 1, "student_id": 1, "department": 1, "course": 1, "year": 1, "section": 1},
    ).to_list(len(ids))
    return {
        str(student["_id"]): {
            "name": student.get("name"),
            "reg_no": student.get("student_id"),
            "branch": student.get("department"),
            "course": student.get("course"),
            "year": student.get("year"),
            "section": student.get("section"),
        }
        for student in students
    }


async def _load_test_map(db, test_ids):
    ids = _valid_object_ids(test_ids)
    if not ids:
        return {}
    tests = await db.tests.find(
        {"_id": {"$in": ids}},
        {"name": 1, "section_id": 1, "section_type": 1, "mode": 1},
    ).to_list(len(ids))
    return {
        str(test["_id"]): {
            "name": test.get("name"),
            "section_id": test.get("section_id"),
            "section_type": test.get("section_type"),
            "exam_type": test.get("mode"),
        }
        for test in tests
    }


async def _load_section_name_map(db, section_ids, collection_name):
    ids = _valid_object_ids(section_ids)
    if not ids:
        return {}
    collection = getattr(db, collection_name)
    docs = await collection.find({"_id": {"$in": ids}}, {"name": 1}).to_list(len(ids))
    return {str(doc["_id"]): doc.get("name") for doc in docs}


def _score_from_row(row):
    if row.get("result_detail") is not None:
        total = len(row.get("result_detail") or [])
        if total:
            passed = len([item for item in row.get("result_detail") or [] if item.get("correct")])
            return round((passed / total) * 100, 2)
        return 0
    test_results = row.get("test_results") or []
    if not test_results:
        return 0
    passed = len([item for item in test_results if item.get("status") == "passed"])
    return round((passed / len(test_results)) * 100, 2)


def _matches_text(value, needle):
    if not needle:
        return True
    if value is None:
        return False
    return needle.lower() in str(value).lower()


def _competition_submission_score(row):
    if row.get("score") is not None:
        return row.get("score")
    if row.get("marks") is not None:
        return row.get("marks")
    if row.get("total_score") is not None:
        return row.get("total_score")
    return 0


def _student_matches_filters(
    student_info,
    row,
    *,
    student_filter=None,
    student_name=None,
    reg_no=None,
    branch=None,
    course=None,
    year=None,
    section=None,
):
    student_display_name = student_info.get("name") or row.get("student_id") or "Unknown"
    student_reg_no = student_info.get("reg_no")
    student_branch = student_info.get("branch") or "Unknown"
    student_course = student_info.get("course") or "Unknown"
    student_year = student_info.get("year")
    student_section = student_info.get("section") or "Unknown"

    if branch and branch != "all" and student_branch != branch:
        return False
    if course and course != "all" and student_course != course:
        return False
    if year not in (None, "", "all"):
        try:
            year_value = int(year)
        except (TypeError, ValueError):
            year_value = year
        if student_year != year_value:
            return False
    if section and section != "all" and student_section != section:
        return False

    combined_needle = student_filter
    if student_name and str(student_name).strip():
        combined_needle = str(student_name).strip()
    if combined_needle and not _matches_text(student_display_name, combined_needle) and not _matches_text(student_reg_no, combined_needle) and not _matches_text(row.get("student_id"), combined_needle):
        return False
    if reg_no and not _matches_text(student_reg_no, reg_no):
        return False

    return True


@router.get("/me")
async def faculty_me(db=Depends(get_db), user=Depends(require_faculty)):
    fac = await db.faculty.find_one({"_id": ObjectId(user["id"])}, {"password_hash": 0})
    if not fac:
        raise HTTPException(404, "Not found")
    fac["id"] = str(fac.pop("_id"))
    return fac


@router.patch("/me")
async def update_faculty_me(
    name: str = Form(None),
    designation: str = Form(None),
    department: str = Form(None),
    contact_number: str = Form(None),
    email: str = Form(None),
    password: str = Form(None),
    profile_photo: UploadFile = File(None),
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    fac = await db.faculty.find_one({"_id": ObjectId(user["id"])} )
    if not fac:
        raise HTTPException(404, "Not found")

    update = {}
    if name is not None: update["name"] = name.strip()
    if designation is not None: update["designation"] = designation.strip()
    if department is not None: update["department"] = department.strip()
    if contact_number is not None: update["contact_number"] = contact_number.strip()
    if email is not None: update["email"] = email.strip()
    if password:
        update["password_hash"] = hash_password(password)
    if profile_photo:
        upload_result = await upload_to_s3(profile_photo, folder="profile-photos")
        update["profile_photo_url"] = upload_result["url"]

    if update:
        await db.faculty.update_one({"_id": ObjectId(user["id"])}, {"$set": update})

    updated = await db.faculty.find_one({"_id": ObjectId(user["id"])}, {"password_hash": 0})
    updated["id"] = str(updated.pop("_id"))
    return updated


@router.get("/evaluation/overview")
async def evaluation_overview(db=Depends(get_db), user=Depends(require_faculty)):
    """Faculty evaluation analytics overview"""
    total_students = await db.students.count_documents({})
    total_tests = await db.tests.count_documents({"created_by": user["id"]})
    total_problems = await db.coding_problems.count_documents({"created_by": user["id"]})
    total_competitions = await db.competitions.count_documents({"faculty_id": user["id"]})

    # Recent submissions with student names
    recent_subs = await db.code_submissions.find({}, {"code": 0}).sort("submitted_at", -1).limit(10).to_list(10)
    student_ids = list({sub.get("student_id") for sub in recent_subs if sub.get("student_id")})
    student_map = {}
    if student_ids:
        student_map = await _load_student_map(db, student_ids)
    for s in recent_subs:
        s["id"] = str(s.pop("_id"))
        student = student_map.get(str(s.get("student_id")), {})
        s["student_name"] = student.get("name", s.get("student_id", "Unknown"))
        s["student_reg_no"] = student.get("reg_no")
        s["student_department"] = student.get("branch")
        s["student_year"] = student.get("year")

    # Active users in last 7 days from login history
    active_since = datetime.utcnow() - timedelta(days=7)
    active_users = await db.login_history.distinct("user_id", {"login_at": {"$gte": active_since}, "role": "student"})

    # Submission trends (last 14 days)
    trend_start = datetime.utcnow() - timedelta(days=14)
    trend_pipeline = [
        {"$match": {"submitted_at": {"$gte": trend_start}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$submitted_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    submission_trends = await db.code_submissions.aggregate(trend_pipeline).to_list(30)

    avg_row = await db.code_submissions.aggregate([
        {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}}
    ]).to_list(1)
    average_score = round(float(avg_row[0]["avg_score"]), 2) if avg_row and avg_row[0].get("avg_score") is not None else 0

    recent_activity = []
    for s in recent_subs[:8]:
        test_name = s.get('test_name') or s.get('problem_name') or 'a problem'
        recent_activity.append({
            "type": "submission",
            "label": f"{s.get('student_name', 'Student')} submitted {test_name}",
            "test_name": test_name,
            "score": s.get('score', 0),
            "status": s.get("status"),
            "time": s.get("submitted_at"),
        })

    return {
        "total_students": total_students,
        "total_tests": total_tests,
        "total_problems": total_problems,
        "total_competitions": total_competitions,
        "active_users": len(active_users),
        "average_score": average_score,
        "submission_trends": submission_trends,
        "recent_activity": recent_activity,
        "recent_submissions": recent_subs,
    }


@router.get("/evaluation/results")
async def evaluation_results(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    start_date: str = None,
    end_date: str = None,
    student: str = None,
    student_name: str = None,
    reg_no: str = None,
    branch: str = None,
    student_course: str = None,
    student_year: str = None,
    student_section: str = None,
    exam_type: str = None,
    section: str = None,
    test: str = None,
    test_id: str = None,
    min_score: float = None,
    max_score: float = None,
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    query = {}
    if start_date or end_date:
        query["submitted_at"] = {}
        if start_date:
            query["submitted_at"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["submitted_at"]["$lte"] = datetime.fromisoformat(end_date) + timedelta(days=1)
    if exam_type and exam_type != "all":
        query["exam_type"] = exam_type
    if section and section != "all":
        query["section_id"] = section
    if min_score is not None or max_score is not None:
        query["score"] = {}
        if min_score is not None:
            query["score"]["$gte"] = min_score
        if max_score is not None:
            query["score"]["$lte"] = max_score
    code_query = query.copy()
    apt_query = query.copy()
    if test_id:
        code_query["problem_id"] = test_id
        apt_query["test_id"] = test_id
    code_rows = await db.code_submissions.find(code_query, {"code": 0}).sort("submitted_at", -1).to_list(5000)
    apt_rows = await db.apt_submissions.find(apt_query).sort("submitted_at", -1).to_list(5000)

    code_student_ids = [row.get("student_id") for row in code_rows if row.get("student_id")]
    apt_student_ids = [row.get("student_id") for row in apt_rows if row.get("student_id")]
    student_map = await _load_student_map(db, code_student_ids + apt_student_ids)
    code_section_map = await _load_section_name_map(db, [row.get("section_id") for row in code_rows if row.get("section_id")], "coding_sections")
    apt_section_map = await _load_section_name_map(db, [row.get("section_id") for row in apt_rows if row.get("section_id")], "apt_sections")
    test_map = await _load_test_map(db, [row.get("test_id") for row in apt_rows if row.get("test_id")])
    student_filter = (student or "").strip() or None

    filtered = []

    for row in code_rows:
        student_info = student_map.get(str(row.get("student_id")), {})
        student_display_name = student_info.get("name") or row.get("student_id") or "Unknown"
        student_reg_no = student_info.get("reg_no")
        student_branch = student_info.get("branch") or "Unknown"
        student_course_value = student_info.get("course") or "Unknown"
        student_year_value = student_info.get("year")
        student_section_value = student_info.get("section") or "Unknown"
        section_id = row.get("section_id")
        section_name = code_section_map.get(str(section_id), section_id or "—")
        test_name = row.get("problem_name") or "Coding Problem"
        if not _student_matches_filters(
            student_info,
            row,
            student_filter=student_filter,
            student_name=student_name,
            reg_no=reg_no,
            branch=branch,
            course=student_course,
            year=student_year,
            section=student_section,
        ):
            continue
        if test and not _matches_text(test_name, test):
            continue

        total_cases = len(row.get("test_results") or [])
        passed = len([case for case in (row.get("test_results") or []) if case.get("status") == "passed"])
        accuracy = round((passed / total_cases) * 100, 2) if total_cases > 0 else 0

        filtered.append({
            "id": str(row.get("_id")),
            "source": "coding",
            "student_user_id": row.get("student_id"),
            "student_id": row.get("student_id"),
            "student_name": student_display_name,
            "student_reg_no": student_reg_no,
            "branch": student_branch,
            "student_course": student_course_value,
            "student_year": student_year_value,
            "student_section": student_section_value,
            "exam_type": row.get("exam_type", row.get("test_type", "practice")),
            "section_id": section_id,
            "concept_id": section_id,
            "section_name": section_name,
            "test_id": row.get("problem_id"),
            "test_name": test_name,
            "language": row.get("language"),
            "status": row.get("status"),
            "marks": row.get("score", 0),
            "accuracy": accuracy,
            "time_taken_ms": row.get("time_taken_ms", 0),
            "submitted_at": row.get("submitted_at"),
        })

    for row in apt_rows:
        student_info = student_map.get(str(row.get("student_id")), {})
        student_display_name = student_info.get("name") or row.get("student_id") or "Unknown"
        student_reg_no = student_info.get("reg_no")
        student_branch = student_info.get("branch") or "Unknown"
        student_course_value = student_info.get("course") or "Unknown"
        student_year_value = student_info.get("year")
        student_section_value = student_info.get("section") or "Unknown"
        test_info = test_map.get(str(row.get("test_id")), {})
        section_id = row.get("section_id") or test_info.get("section_id")
        section_name = apt_section_map.get(str(section_id), section_id or "—")
        test_name = row.get("test_name") or test_info.get("name") or "Test"
        exam_value = row.get("exam_type") or test_info.get("exam_type") or "practice"
        if not _student_matches_filters(
            student_info,
            row,
            student_filter=student_filter,
            student_name=student_name,
            reg_no=reg_no,
            branch=branch,
            course=student_course,
            year=student_year,
            section=student_section,
        ):
            continue
        if test and not _matches_text(test_name, test):
            continue

        filtered.append({
            "id": str(row.get("_id")),
            "source": "aptitude",
            "student_user_id": row.get("student_id"),
            "student_id": row.get("student_id"),
            "student_name": student_display_name,
            "student_reg_no": student_reg_no,
            "branch": student_branch,
            "student_course": student_course_value,
            "student_year": student_year_value,
            "student_section": student_section_value,
            "exam_type": exam_value,
            "section_id": section_id,
            "concept_id": row.get("concept_id") or section_id,
            "section_name": section_name,
            "test_id": row.get("test_id"),
            "test_name": test_name,
            "status": row.get("status", "submitted"),
            "marks": row.get("score", 0),
            "accuracy": _score_from_row(row),
            "time_taken_ms": row.get("time_taken_ms", 0),
            "submitted_at": row.get("submitted_at"),
        })

    filtered.sort(key=lambda item: item.get("submitted_at") or datetime.min, reverse=True)

    total = len(filtered)
    start = (page - 1) * limit
    items = filtered[start:start + limit]

    section_ids = list({item.get("section_id") for item in filtered if item.get("section_id")})
    sections = []
    if section_ids:
        coding_section_ids = [sid for sid in section_ids if sid in code_section_map]
        aptitude_section_ids = [sid for sid in section_ids if sid in apt_section_map]
        sections.extend([{ "id": sid, "name": code_section_map.get(sid) } for sid in coding_section_ids])
        sections.extend([{ "id": sid, "name": apt_section_map.get(sid) } for sid in aptitude_section_ids if apt_section_map.get(sid)])

    tests = sorted(list({item.get("test_name") for item in filtered if item.get("test_name")}))
    branches = sorted(list({item.get("branch") for item in filtered if item.get("branch")}))
    courses = sorted(list({item.get("student_course") for item in filtered if item.get("student_course")}))
    student_years = sorted(list({item.get("student_year") for item in filtered if item.get("student_year") is not None}), key=lambda value: str(value))
    student_sections = sorted(list({item.get("student_section") for item in filtered if item.get("student_section")}))

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "sections": sections,
        "tests": tests[:300],
        "branches": branches,
        "courses": courses,
        "student_years": student_years,
        "student_sections": student_sections,
    }


@router.get("/evaluation/results/export")
async def export_evaluation_results(
    start_date: str = None,
    end_date: str = None,
    student: str = None,
    student_name: str = None,
    reg_no: str = None,
    branch: str = None,
    student_course: str = None,
    student_year: str = None,
    student_section: str = None,
    exam_type: str = None,
    section: str = None,
    test: str = None,
    test_id: str = None,
    min_score: float = None,
    max_score: float = None,
    format: str = "xlsx",
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    payload = await evaluation_results(
        page=1,
        limit=5000,
        start_date=start_date,
        end_date=end_date,
        student=student,
        student_name=student_name,
        reg_no=reg_no,
        branch=branch,
        student_course=student_course,
        student_year=student_year,
        student_section=student_section,
        exam_type=exam_type,
        section=section,
        test=test,
        test_id=test_id,
        min_score=min_score,
        max_score=max_score,
        db=db,
        user=user,
    )

    rows = []
    for item in payload.get("items", []):
        rows.append({
            "Student Name": item.get("student_name"),
            "Register Number": item.get("student_reg_no"),
            "Branch": item.get("branch"),
            "Course": item.get("student_course"),
            "Year": item.get("student_year"),
            "Student Section": item.get("student_section"),
            "Exam Type": item.get("exam_type"),
            "Section": item.get("section_id"),
            "Test": item.get("test_name"),
            "Marks": item.get("marks"),
            "Accuracy %": item.get("accuracy"),
            "Time Taken (ms)": item.get("time_taken_ms"),
            "Status": item.get("status"),
            "Submitted At": item.get("submitted_at"),
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        csv_data = df.to_csv(index=False).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=faculty_evaluation_{now}.csv"},
        )

    df.to_excel(buf, index=False, sheet_name="Evaluation")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=faculty_evaluation_{now}.xlsx"},
    )


@router.get("/evaluation/test/{test_id}/results")
async def evaluation_test_results(
    test_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    start_date: str = None,
    end_date: str = None,
    student: str = None,
    student_name: str = None,
    reg_no: str = None,
    branch: str = None,
    student_course: str = None,
    student_year: str = None,
    student_section: str = None,
    exam_type: str = None,
    min_score: float = None,
    max_score: float = None,
    format: str = None,
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    test = await db.tests.find_one({"_id": ObjectId(test_id)})
    if not test:
        raise HTTPException(404, "Test not found")

    query = {"test_id": test_id}
    if start_date or end_date:
        query["submitted_at"] = {}
        if start_date:
            query["submitted_at"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["submitted_at"]["$lte"] = datetime.fromisoformat(end_date) + timedelta(days=1)
    if exam_type and exam_type != "all":
        query["exam_type"] = exam_type
    if min_score is not None or max_score is not None:
        query["score"] = {}
        if min_score is not None:
            query["score"]["$gte"] = min_score
        if max_score is not None:
            query["score"]["$lte"] = max_score

    rows = await db.apt_submissions.find(query).sort("submitted_at", -1).to_list(5000)
    student_map = await _load_student_map(db, [row.get("student_id") for row in rows if row.get("student_id")])
    student_filter = (student or "").strip() or None

    results = []
    for row in rows:
        student_info = student_map.get(str(row.get("student_id")), {})
        student_display_name = student_info.get("name") or row.get("student_id") or "Unknown"
        student_reg_no = student_info.get("reg_no")
        student_branch = student_info.get("branch") or "Unknown"
        student_course_value = student_info.get("course") or "Unknown"
        student_year_value = student_info.get("year")
        student_section_value = student_info.get("section") or "Unknown"
        if not _student_matches_filters(
            student_info,
            row,
            student_filter=student_filter,
            student_name=student_name,
            reg_no=reg_no,
            branch=branch,
            course=student_course,
            year=student_year,
            section=student_section,
        ):
            continue

        results.append({
            "id": str(row.get("_id")),
            "source": "aptitude",
            "student_user_id": row.get("student_id"),
            "student_id": row.get("student_id"),
            "student_name": student_display_name,
            "student_reg_no": student_reg_no,
            "branch": student_branch,
            "student_course": student_course_value,
            "student_year": student_year_value,
            "student_section": student_section_value,
            "exam_type": row.get("exam_type") or test.get("mode", "practice"),
            "section_id": row.get("section_id") or test.get("section_id"),
            "concept_id": row.get("concept_id") or row.get("section_id") or test.get("section_id"),
            "section_name": test.get("section_id"),
            "test_id": test_id,
            "test_name": row.get("test_name") or test.get("name"),
            "status": row.get("status", "submitted"),
            "marks": row.get("score", 0),
            "accuracy": _score_from_row(row),
            "time_taken_ms": row.get("time_taken_ms", 0),
            "submitted_at": row.get("submitted_at"),
        })

    results.sort(key=lambda item: item.get("submitted_at") or datetime.min, reverse=True)
    total = len(results)
    items = results[(page - 1) * limit:(page - 1) * limit + limit]

    return {"items": items, "total": total, "page": page, "limit": limit, "test": {"id": test_id, "name": test.get("name"), "section_id": test.get("section_id"), "mode": test.get("mode")}}


@router.get("/evaluation/test/{test_id}/results/export")
async def export_evaluation_test_results(
    test_id: str,
    start_date: str = None,
    end_date: str = None,
    student: str = None,
    student_name: str = None,
    reg_no: str = None,
    branch: str = None,
    student_course: str = None,
    student_year: str = None,
    student_section: str = None,
    exam_type: str = None,
    min_score: float = None,
    max_score: float = None,
    format: str = "xlsx",
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    payload = await evaluation_test_results(
        test_id=test_id,
        page=1,
        limit=5000,
        start_date=start_date,
        end_date=end_date,
        student=student,
        student_name=student_name,
        reg_no=reg_no,
        branch=branch,
        student_course=student_course,
        student_year=student_year,
        student_section=student_section,
        exam_type=exam_type,
        min_score=min_score,
        max_score=max_score,
        db=db,
        user=user,
    )

    rows = []
    for item in payload.get("items", []):
        rows.append({
            "Student Name": item.get("student_name"),
            "Register Number": item.get("student_reg_no"),
            "Branch": item.get("branch"),
            "Course": item.get("student_course"),
            "Year": item.get("student_year"),
            "Student Section": item.get("student_section"),
            "Exam Type": item.get("exam_type"),
            "Section": item.get("section_id"),
            "Test": item.get("test_name"),
            "Marks": item.get("marks"),
            "Accuracy %": item.get("accuracy"),
            "Time Taken (ms)": item.get("time_taken_ms"),
            "Status": item.get("status"),
            "Submitted At": item.get("submitted_at"),
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if format == "csv":
        csv_data = df.to_csv(index=False).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=faculty_test_results_{now}.csv"},
        )

    df.to_excel(buf, index=False, sheet_name="Results")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=faculty_test_results_{now}.xlsx"},
    )


@router.get("/evaluation/competition/{competition_id}/test/{test_id}/results")
async def competition_test_results(
    competition_id: str,
    test_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    start_date: str = None,
    end_date: str = None,
    student: str = None,
    student_name: str = None,
    reg_no: str = None,
    branch: str = None,
    student_course: str = None,
    student_year: str = None,
    student_section: str = None,
    min_score: float = None,
    max_score: float = None,
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    try:
        competition = await db.competitions.find_one({"_id": ObjectId(competition_id)})
        competition_test = await db.competition_tests.find_one(
            {"_id": ObjectId(test_id), "competition_id": competition_id}
        )
    except Exception:
        raise HTTPException(400, "Invalid competition/test ID")

    if not competition:
        raise HTTPException(404, "Competition not found")
    if competition.get("faculty_id") != user.get("id"):
        raise HTTPException(403, "Not allowed to view this competition")
    if not competition_test:
        raise HTTPException(404, "Competition test not found")

    query = {
        "competition_id": competition_id,
        "$or": [
            {"test_id": test_id},
            {"competition_test_id": test_id},
        ],
    }
    if start_date or end_date:
        query["submitted_at"] = {}
        if start_date:
            query["submitted_at"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["submitted_at"]["$lte"] = datetime.fromisoformat(end_date) + timedelta(days=1)
    if min_score is not None or max_score is not None:
        query["score"] = {}
        if min_score is not None:
            query["score"]["$gte"] = min_score
        if max_score is not None:
            query["score"]["$lte"] = max_score

    rows = await db.competition_submissions.find(query).sort("submitted_at", -1).to_list(5000)
    student_map = await _load_student_map(db, [row.get("student_id") for row in rows if row.get("student_id")])
    student_filter = (student or "").strip() or None

    results = []
    for row in rows:
        student_info = student_map.get(str(row.get("student_id")), {})
        student_display_name = student_info.get("name") or row.get("student_id") or "Unknown"
        student_reg_no = student_info.get("reg_no")
        student_branch = student_info.get("branch") or "Unknown"
        student_course_value = student_info.get("course") or "Unknown"
        student_year_value = student_info.get("year")
        student_section_value = student_info.get("section") or "Unknown"

        if not _student_matches_filters(
            student_info,
            row,
            student_filter=student_filter,
            student_name=student_name,
            reg_no=reg_no,
            branch=branch,
            course=student_course,
            year=student_year,
            section=student_section,
        ):
            continue

        status = row.get("status") or "submitted"
        submitted_at = row.get("submitted_at") or row.get("attempted_at")
        score_value = _competition_submission_score(row)

        # Keep filters robust when score is stored under keys other than "score".
        if min_score is not None and (score_value is None or score_value < min_score):
            continue
        if max_score is not None and (score_value is None or score_value > max_score):
            continue

        results.append(
            {
                "id": str(row.get("_id")),
                "source": "competition",
                "competition_id": competition_id,
                "competition_name": competition.get("name"),
                "competition_test_id": test_id,
                "student_user_id": row.get("student_id"),
                "student_id": row.get("student_id"),
                "student_name": student_display_name,
                "student_reg_no": student_reg_no,
                "branch": student_branch,
                "student_course": student_course_value,
                "student_year": student_year_value,
                "student_section": student_section_value,
                "exam_type": row.get("exam_type") or "competitor",
                "section_id": row.get("section_id") or competition_test.get("test_type") or "competition",
                "concept_id": row.get("concept_id") or competition_test.get("test_type") or "competition",
                "section_name": competition_test.get("test_type") or "competition",
                "test_id": row.get("test_id") or row.get("competition_test_id") or test_id,
                "test_name": row.get("test_name") or competition_test.get("name"),
                "status": status,
                "marks": score_value,
                "accuracy": _score_from_row(row),
                "time_taken_ms": row.get("time_taken_ms") or row.get("duration_ms") or 0,
                "submitted_at": submitted_at,
            }
        )

    results.sort(key=lambda item: item.get("submitted_at") or datetime.min, reverse=True)
    total = len(results)
    items = results[(page - 1) * limit:(page - 1) * limit + limit]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "test": {
            "id": test_id,
            "name": competition_test.get("name"),
            "test_type": competition_test.get("test_type"),
            "competition_id": competition_id,
            "competition_name": competition.get("name"),
        },
    }


@router.get("/evaluation/competition/{competition_id}/test/{test_id}/results/export")
async def export_competition_test_results(
    competition_id: str,
    test_id: str,
    start_date: str = None,
    end_date: str = None,
    student: str = None,
    student_name: str = None,
    reg_no: str = None,
    branch: str = None,
    student_course: str = None,
    student_year: str = None,
    student_section: str = None,
    min_score: float = None,
    max_score: float = None,
    format: str = "xlsx",
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    payload = await competition_test_results(
        competition_id=competition_id,
        test_id=test_id,
        page=1,
        limit=5000,
        start_date=start_date,
        end_date=end_date,
        student=student,
        student_name=student_name,
        reg_no=reg_no,
        branch=branch,
        student_course=student_course,
        student_year=student_year,
        student_section=student_section,
        min_score=min_score,
        max_score=max_score,
        db=db,
        user=user,
    )

    rows = []
    for item in payload.get("items", []):
        rows.append(
            {
                "Competition": item.get("competition_name"),
                "Test": item.get("test_name"),
                "Student Name": item.get("student_name"),
                "Register Number": item.get("student_reg_no"),
                "Branch": item.get("branch"),
                "Course": item.get("student_course"),
                "Year": item.get("student_year"),
                "Student Section": item.get("student_section"),
                "Exam Type": item.get("exam_type"),
                "Marks": item.get("marks"),
                "Accuracy %": item.get("accuracy"),
                "Time Taken (ms)": item.get("time_taken_ms"),
                "Status": item.get("status"),
                "Submitted At": item.get("submitted_at"),
            }
        )

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if format == "csv":
        csv_data = df.to_csv(index=False).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(csv_data),
            media_type="text/csv",
            headers={
                "Content-Disposition": (
                    f"attachment; filename=faculty_competition_test_results_{now}.csv"
                )
            },
        )

    df.to_excel(buf, index=False, sheet_name="Competition Test Results")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": (
                f"attachment; filename=faculty_competition_test_results_{now}.xlsx"
            )
        },
    )


@router.get("/evaluation/test/{test_id}/stats")
async def test_stats(test_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    pipeline = [
        {"$match": {"test_id": test_id}},
        {
            "$group": {
                "_id": None,
                "avg_score": {"$avg": "$score"},
                "max_score": {"$max": "$score"},
                "min_score": {"$min": "$score"},
                "total_attempts": {"$sum": 1},
            }
        },
    ]
    result = await db.apt_submissions.aggregate(pipeline).to_list(1)
    return result[0] if result else {}
