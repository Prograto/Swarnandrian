from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from bson import ObjectId
from app.core.security import require_faculty, get_current_user
from app.core.websocket_manager import ws_manager
from app.db.mongodb import get_db
from app.models.schemas import CompetitionCreate, CompetitionTestCreate
from app.utils.stats import get_best_submission_score, refresh_student_stats

router = APIRouter()
async def _upsert_general_leaderboard(db, student_id: str, competition: dict, test: dict) -> None:
    score_value = await get_best_submission_score(
        db,
        "competition_submissions",
        {
            "competition_id": str(competition["_id"]),
            "test_id": str(test["_id"]),
            "student_id": student_id,
        },
    )

    await db.leaderboard.update_one(
        {
            "student_id": student_id,
            "section_type": "competition",
            "section_id": str(competition["_id"]),
            "test_id": str(test["_id"]),
        },
        {
            "$set": {
                "student_id": student_id,
                "section_type": "competition",
                "section_id": str(competition["_id"]),
                "section_name": competition.get("name"),
                "section": competition.get("name"),
                "test_id": str(test["_id"]),
                "test_name": test.get("name"),
                "score": score_value,
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "attempts": 0,
            },
            "$inc": {
                "attempts": 1,
            },
        },
        upsert=True,
    )



def _can_manage_comp(user: dict, comp: dict) -> bool:
    if user.get("role") == "admin":
        return True
    return user.get("role") == "faculty" and comp.get("faculty_id") == user.get("id")


def _get_status(c: dict) -> str:
    now = datetime.utcnow()
    start = c.get("start_time")
    end   = c.get("end_time")
    if not start or not end:
        return "unknown"
    # Handle both naive and aware datetimes
    if hasattr(start, 'tzinfo') and start.tzinfo:
        start = start.replace(tzinfo=None)
    if hasattr(end, 'tzinfo') and end.tzinfo:
        end = end.replace(tzinfo=None)
    if now < start:
        return "upcoming"
    elif now <= end:
        return "active"
    return "ended"


@router.post("/", status_code=201)
async def create_competition(data: CompetitionCreate, db=Depends(get_db), user=Depends(require_faculty)):
    existing = await db.competitions.find_one({"access_code": data.access_code})
    if existing:
        raise HTTPException(409, "Access code already in use. Please choose a different one.")
    doc = {
        **data.model_dump(),
        "faculty_id": user["id"],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "tests": [],
    }
    result = await db.competitions.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Competition created"}


@router.get("/")
async def list_competitions(
    search: str = Query(default=""),
    status: str = Query(default="all"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=100),
    paginate: bool = Query(default=False),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {}
    if user["role"] == "student":
        query["is_active"] = True

    comps = await db.competitions.find(query).to_list(200)
    result = []
    needle = (search or "").strip().lower()
    for c in comps:
        c_status = _get_status(c)
        if status != "all" and c_status != status:
            continue
        if needle:
            hay = f"{c.get('name', '')} {c.get('description', '')}".lower()
            if needle not in hay:
                continue

        c["id"] = str(c.pop("_id"))
        c["status"] = c_status
        # Hide access_code from students
        if user["role"] == "student":
            c.pop("access_code", None)
        result.append(c)

    result.sort(key=lambda row: row.get("start_time") or datetime.min, reverse=True)

    if not paginate:
        return result

    start = (page - 1) * limit
    end = start + limit
    return {
        "items": result[start:end],
        "total": len(result),
        "page": page,
        "limit": limit,
    }


@router.get("/{comp_id}")
async def get_competition(comp_id: str, db=Depends(get_db), _=Depends(get_current_user)):
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    comp["id"] = str(comp.pop("_id"))
    comp["status"] = _get_status(comp)
    return comp


@router.patch("/{comp_id}/toggle")
async def toggle_competition(comp_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not _can_manage_comp(user, comp):
        raise HTTPException(403, "Not allowed to manage this competition")
    new_state = not comp.get("is_active", True)
    await db.competitions.update_one({"_id": ObjectId(comp_id)}, {"$set": {"is_active": new_state}})
    return {"is_active": new_state}


@router.put("/{comp_id}")
async def update_competition(comp_id: str, data: CompetitionCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not _can_manage_comp(user, comp):
        raise HTTPException(403, "Not allowed to manage this competition")

    if data.access_code != comp.get("access_code"):
        existing = await db.competitions.find_one({"access_code": data.access_code, "_id": {"$ne": ObjectId(comp_id)}})
        if existing:
            raise HTTPException(409, "Access code already in use")

    payload = data.model_dump()
    payload["updated_at"] = datetime.utcnow()
    await db.competitions.update_one({"_id": ObjectId(comp_id)}, {"$set": payload})
    updated = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    updated["id"] = str(updated.pop("_id"))
    updated["status"] = _get_status(updated)
    return updated


@router.delete("/{comp_id}")
async def delete_competition(comp_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not _can_manage_comp(user, comp):
        raise HTTPException(403, "Not allowed to manage this competition")

    await db.competition_tests.delete_many({"competition_id": comp_id})
    await db.competition_participants.delete_many({"competition_id": comp_id})
    await db.competition_submissions.delete_many({"competition_id": comp_id})
    await db.competitions.delete_one({"_id": ObjectId(comp_id)})
    return {"ok": True}


@router.post("/{comp_id}/tests", status_code=201)
async def add_competition_test(comp_id: str, data: CompetitionTestCreate, db=Depends(get_db), _=Depends(require_faculty)):
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    doc = {**data.model_dump(), "competition_id": comp_id, "is_active": data.is_active, "created_at": datetime.utcnow()}
    result = await db.competition_tests.insert_one(doc)
    await db.competitions.update_one(
        {"_id": ObjectId(comp_id)},
        {"$push": {"tests": str(result.inserted_id)}}
    )
    return {"id": str(result.inserted_id)}


@router.get("/{comp_id}/tests")
async def list_competition_tests(
    comp_id: str,
    access_code: str = Query(default=""),
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=100),
    paginate: bool = Query(default=False),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if user.get("role") == "student" and not comp.get("is_active"):
        raise HTTPException(403, "Competition is not active")

    if user.get("role") == "student":
        participant = await db.competition_participants.find_one(
            {"competition_id": comp_id, "student_id": user["id"]}
        )
        if not participant:
            if not access_code:
                raise HTTPException(403, "Access code required")
            if access_code != comp.get("access_code"):
                raise HTTPException(403, "Invalid access code")
            now = datetime.utcnow()
            await db.competition_participants.update_one(
                {"competition_id": comp_id, "student_id": user["id"]},
                {"$set": {"joined_at": now}},
                upsert=True,
            )

    test_query = {"competition_id": comp_id}
    if user.get("role") == "student":
        test_query["is_active"] = True

    tests = await db.competition_tests.find(test_query).sort("created_at", -1).to_list(500)
    student_branch = user.get("branch") or user.get("department")
    if user.get("role") == "student" and student_branch:
        tests = [test for test in tests if not test.get("branch") or test.get("branch") == student_branch]

    needle = (search or "").strip().lower()
    if needle:
        tests = [
            test for test in tests
            if needle in f"{test.get('name', '')} {test.get('description', '')}".lower()
        ]

    for test in tests:
        test["id"] = str(test.pop("_id"))

    if not paginate:
        return tests

    start = (page - 1) * limit
    end = start + limit
    return {
        "items": tests[start:end],
        "total": len(tests),
        "page": page,
        "limit": limit,
    }


@router.put("/{comp_id}/tests/{test_id}")
async def update_competition_test(comp_id: str, test_id: str, data: CompetitionTestCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
        test_oid = ObjectId(test_id)
    except Exception:
        raise HTTPException(400, "Invalid competition/test ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not _can_manage_comp(user, comp):
        raise HTTPException(403, "Not allowed to manage this competition")
    updated = await db.competition_tests.update_one(
        {"_id": test_oid, "competition_id": comp_id},
        {"$set": {**data.model_dump(), "competition_id": comp_id, "updated_at": datetime.utcnow()}},
    )
    if updated.matched_count == 0:
        raise HTTPException(404, "Test not found")
    doc = await db.competition_tests.find_one({"_id": test_oid})
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.delete("/{comp_id}/tests/{test_id}")
async def delete_competition_test(comp_id: str, test_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
        test_oid = ObjectId(test_id)
    except Exception:
        raise HTTPException(400, "Invalid competition/test ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not _can_manage_comp(user, comp):
        raise HTTPException(403, "Not allowed to manage this competition")

    deleted = await db.competition_tests.delete_one({"_id": test_oid, "competition_id": comp_id})
    if deleted.deleted_count == 0:
        raise HTTPException(404, "Test not found")
    await db.competitions.update_one({"_id": ObjectId(comp_id)}, {"$pull": {"tests": test_id}})
    return {"ok": True}


@router.patch("/{comp_id}/tests/{test_id}/toggle")
async def toggle_competition_test(comp_id: str, test_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") not in ("faculty", "admin"):
        raise HTTPException(403, "Forbidden")
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
        test_oid = ObjectId(test_id)
    except Exception:
        raise HTTPException(400, "Invalid competition/test ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not _can_manage_comp(user, comp):
        raise HTTPException(403, "Not allowed to manage this competition")

    test = await db.competition_tests.find_one({"_id": test_oid, "competition_id": comp_id})
    if not test:
        raise HTTPException(404, "Test not found")
    new_state = not test.get("is_active", True)
    await db.competition_tests.update_one({"_id": test_oid}, {"$set": {"is_active": new_state}})
    return {"id": test_id, "is_active": new_state}


@router.post("/{comp_id}/join")
async def join_competition(comp_id: str, access_code: str, db=Depends(get_db), user=Depends(get_current_user)):
    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
    except Exception:
        raise HTTPException(400, "Invalid competition ID")
    if not comp:
        raise HTTPException(404, "Competition not found")
    if comp.get("access_code") != access_code:
        raise HTTPException(403, "Invalid access code")
    if not comp.get("is_active"):
        raise HTTPException(400, "This competition is currently disabled")
    status = _get_status(comp)
    if status == "ended":
        raise HTTPException(400, "This competition has ended")
    if status == "upcoming":
        raise HTTPException(400, "This competition has not started yet")

    now = datetime.utcnow()
    await db.competition_participants.update_one(
        {"competition_id": comp_id, "student_id": user["id"]},
        {"$set": {"joined_at": now}},
        upsert=True,
    )
    return {"message": "Joined successfully", "competition": comp.get("name")}


@router.get("/{comp_id}/tests/{test_id}/attempt")
async def get_competition_test_attempt(comp_id: str, test_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(403, "Only students can attempt competition tests")

    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
        test = await db.competition_tests.find_one({"_id": ObjectId(test_id), "competition_id": comp_id, "is_active": True})
    except Exception:
        raise HTTPException(400, "Invalid competition/test ID")

    if not comp:
        raise HTTPException(404, "Competition not found")
    if not test:
        raise HTTPException(404, "Competition test not found")

    participant = await db.competition_participants.find_one({"competition_id": comp_id, "student_id": user["id"]})
    if not participant:
        raise HTTPException(403, "Join competition first")

    if test.get("test_type") not in ("aptitude", "technical"):
        raise HTTPException(400, "Only aptitude/technical competition tests are supported here")

    projection = {"correct_options": 0, "correct_answer": 0, "explanation": 0}
    question_ids = [ObjectId(qid) for qid in test.get("question_ids", []) if ObjectId.is_valid(qid)]
    questions = await db.apt_questions.find({"_id": {"$in": question_ids}, "is_active": True}, projection).to_list(500)
    for q in questions:
        q["id"] = str(q.pop("_id"))

    return {
        "id": str(test["_id"]),
        "name": test.get("name"),
        "description": test.get("description"),
        "test_type": test.get("test_type"),
        "time_limit_minutes": test.get("time_limit_minutes") or 60,
        "questions": questions,
        "competition_id": comp_id,
    }


@router.post("/{comp_id}/tests/{test_id}/submit")
async def submit_competition_test(
    comp_id: str,
    test_id: str,
    answers: dict,
    time_taken_ms: int = 0,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    if user.get("role") != "student":
        raise HTTPException(403, "Only students can submit competition tests")

    try:
        comp = await db.competitions.find_one({"_id": ObjectId(comp_id)})
        test = await db.competition_tests.find_one({"_id": ObjectId(test_id), "competition_id": comp_id, "is_active": True})
    except Exception:
        raise HTTPException(400, "Invalid competition/test ID")

    if not comp:
        raise HTTPException(404, "Competition not found")
    if not test:
        raise HTTPException(404, "Competition test not found")

    participant = await db.competition_participants.find_one({"competition_id": comp_id, "student_id": user["id"]})
    if not participant:
        raise HTTPException(403, "Join competition first")

    if test.get("test_type") not in ("aptitude", "technical"):
        raise HTTPException(400, "Only aptitude/technical competition tests are supported here")

    max_attempts = int(comp.get("max_attempts") or 1)
    prev_attempts = await db.competition_submissions.count_documents(
        {"competition_id": comp_id, "test_id": test_id, "student_id": user["id"]}
    )
    if prev_attempts >= max_attempts:
        raise HTTPException(429, "Maximum attempts reached for this competition test")

    question_ids = [ObjectId(qid) for qid in test.get("question_ids", []) if ObjectId.is_valid(qid)]
    questions = await db.apt_questions.find({"_id": {"$in": question_ids}, "is_active": True}).to_list(500)

    score = 0.0
    for q in questions:
        qid = str(q["_id"])
        student_ans = answers.get(qid)
        correct = False

        if q.get("question_type") in ("mcq", "msq"):
            correct = set(student_ans or []) == set(q.get("correct_options", []))
        elif q.get("question_type") in ("nat", "fill"):
            correct = str(student_ans or "").strip().lower() == str(q.get("correct_answer", "")).strip().lower()

        if correct:
            score += q.get("marks", 1)
        else:
            score -= q.get("negative_marks", 0)

    submission = {
        "competition_id": comp_id,
        "test_id": test_id,
        "student_id": user["id"],
        "test_name": test.get("name"),
        "section_name": comp.get("name"),
        "section_type": "competition",
        "exam_type": "competitor",
        "score": max(0, score),
        "time_taken_ms": max(0, int(time_taken_ms or 0)),
        "submitted_at": datetime.utcnow(),
    }
    inserted = await db.competition_submissions.insert_one(submission)

    await _upsert_general_leaderboard(db, user["id"], comp, test)
    await ws_manager.broadcast("leaderboard", {"type": "score_update", "student_id": user["id"]})

    await refresh_student_stats(db, user["id"])

    return {
        "id": str(inserted.inserted_id),
        "score": max(0, score),
    }


@router.get("/{comp_id}/leaderboard")
async def competition_leaderboard(comp_id: str, db=Depends(get_db), _=Depends(get_current_user)):
    pipeline = [
        {"$match": {"competition_id": comp_id}},
        {
            "$group": {
                "_id": {"student_id": "$student_id", "test_id": "$test_id"},
                "best_score": {"$max": {"$ifNull": ["$score", 0]}},
            }
        },
        {"$group": {"_id": "$_id.student_id", "total": {"$sum": "$best_score"}}},
        {"$sort": {"total": -1}},
        {"$limit": 100},
    ]
    results = await db.competition_submissions.aggregate(pipeline).to_list(100)
    return {"leaderboard": [{"student_id": r["_id"], "score": r["total"]} for r in results]}
