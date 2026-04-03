from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
import httpx

from app.core.security import get_current_user, require_faculty
from app.db.mongodb import get_db
from app.models.schemas import CodeSubmitRequest, SubmissionStatus
from app.core.config import settings
from app.core.websocket_manager import ws_manager

router = APIRouter()


async def _load_section_doc(db, collection_name: str, section_id: str):
    if not section_id or not ObjectId.is_valid(str(section_id)):
        return None
    return await db[collection_name].find_one(
        {"_id": ObjectId(section_id)},
        {"name": 1, "is_active": 1, "branch": 1},
    )


async def _update_leaderboard(
    db,
    student_id: str,
    section_type: str,
    score: float,
    section_id: str | None = None,
    test_id: str | None = None,
    section_name: str | None = None,
    test_name: str | None = None,
):
    query = {"student_id": student_id, "section_type": section_type}
    if section_id:
        query["section_id"] = section_id
    if test_id:
        query["test_id"] = test_id

    payload = {
        "student_id": student_id,
        "section_type": section_type,
        "score": max(0, score),
        "updated_at": datetime.utcnow(),
    }
    if section_id:
        payload["section_id"] = section_id
    if test_id:
        payload["test_id"] = test_id
    if section_name:
        payload["section_name"] = section_name
    if test_name:
        payload["test_name"] = test_name

    existing = await db.leaderboard.find_one(query)
    if existing:
        if max(0, score) > existing.get("score", 0):
            update_payload = {"score": max(0, score), "updated_at": datetime.utcnow()}
            if section_name is not None:
                update_payload["section_name"] = section_name
            if test_name is not None:
                update_payload["test_name"] = test_name
            await db.leaderboard.update_one(query, {"$set": update_payload})
        return

    await db.leaderboard.insert_one(payload)


async def _call_code_runner(payload: dict) -> dict:
    """Call the code execution microservice."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.CODE_RUNNER_BASE_URL}/execute",
            json=payload,
            headers={"X-Internal-Secret": settings.CODE_RUNNER_SECRET},
        )
        resp.raise_for_status()
        return resp.json()


@router.post("/code")
async def submit_code(
    data: CodeSubmitRequest,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    # Fetch problem with private test cases
    problem = await db.coding_problems.find_one({"_id": ObjectId(data.problem_id)})
    if not problem:
        raise HTTPException(404, "Problem not found")
    if not problem.get("is_active", True):
        raise HTTPException(403, "This coding problem is currently disabled")

    section_name = None
    section_id = problem.get("section_id")
    section = await _load_section_doc(db, "coding_sections", section_id)
    if section:
        if user["role"] == "student":
            if not section.get("is_active", True):
                raise HTTPException(403, "This coding section is currently disabled")
            student_branch = user.get("branch") or user.get("department")
            if section.get("branch") and section.get("branch") != student_branch:
                raise HTTPException(403, "This coding section is not available for your branch")
        section_name = section.get("name")

    public_cases = [
        {"input": problem["sample_input_1"], "expected": problem["sample_output_1"]},
        {"input": problem["sample_input_2"], "expected": problem["sample_output_2"]},
    ]
    private_cases = problem.get("private_test_cases", [])

    all_cases = []
    for i, c in enumerate(public_cases, 1):
        all_cases.append({"number": i, "input": c["input"], "expected": c["expected"], "is_private": False})
    for i, c in enumerate(private_cases, len(public_cases) + 1):
        all_cases.append({"number": i, "input": c["input"], "expected": c["expected_output"], "is_private": True})

    run_payload = {
        "language": data.language,
        "code": data.code,
        "test_cases": all_cases,
        "mode": data.mode,
        "time_limit": settings.SANDBOX_TIMEOUT,
        "memory_limit": settings.SANDBOX_MEM_LIMIT,
    }

    try:
        result = await _call_code_runner(run_payload)
    except Exception as e:
        raise HTTPException(500, f"Code execution service error: {e}")

    # Build test results (hide private expected/actual output)
    test_results = []
    all_passed = True
    for tr in result.get("test_results", []):
        is_private = tr.get("is_private", False)
        status = tr.get("status", "failed")
        if status != "passed":
            all_passed = False
        entry = {
            "case_number": tr["number"],
            "is_private": is_private,
            "status": status,
            "time_ms": tr.get("time_ms"),
            "memory_kb": tr.get("memory_kb"),
        }
        if not is_private:
            entry["expected"] = tr.get("expected", "")
            entry["actual"] = tr.get("actual", "")
        test_results.append(entry)

    overall_status = SubmissionStatus.ACCEPTED if all_passed else SubmissionStatus.WRONG_ANSWER
    if result.get("compilation_error"):
        overall_status = SubmissionStatus.COMPILATION_ERROR
    elif result.get("runtime_error"):
        overall_status = SubmissionStatus.RUNTIME_ERROR
    elif result.get("tle"):
        overall_status = SubmissionStatus.TLE
    elif result.get("mle"):
        overall_status = SubmissionStatus.MLE

    score = problem.get("marks", 0) if all_passed else 0

    submission_doc = {
        "problem_id": data.problem_id,
        "student_id": user["id"],
        "student_user_id": user["id"],
        "language": data.language,
        "section_id": problem.get("section_id"),
        "section_name": section_name,
        "section_type": "coding",
        "test_id": problem.get("problem_id"),
        "test_name": problem.get("name"),
        "exam_type": problem.get("mode", "practice"),
        "test_type": "coding",
        "problem_name": problem.get("name"),
        "code": data.code,
        "status": overall_status,
        "score": score,
        "test_results": test_results,
        "compilation_error": result.get("compilation_error"),
        "runtime_error": result.get("runtime_error"),
        "time_taken_ms": sum([tr.get("time_ms") or 0 for tr in result.get("test_results", [])]),
        "submitted_at": datetime.utcnow(),
    }

    if data.mode == "submit":
        inserted = await db.code_submissions.insert_one(submission_doc)
        submission_doc["id"] = str(inserted.inserted_id)
        # PyMongo mutates inserted docs by adding _id (ObjectId), which is not JSON-serializable.
        submission_doc.pop("_id", None)

        # Update student stats if accepted
        if overall_status == SubmissionStatus.ACCEPTED:
            await db.students.update_one(
                {"_id": ObjectId(user["id"])},
                {"$inc": {"stats.total_score": score, "stats.problems_solved": 1}},
            )
            await _update_leaderboard(
                db,
                user["id"],
                "coding",
                score,
                section_id=problem.get("section_id"),
                test_id=problem.get("problem_id"),
                section_name=section_name,
                test_name=problem.get("name"),
            )
            # Broadcast leaderboard update
            await ws_manager.broadcast("leaderboard", {"type": "score_update", "student_id": user["id"]})
    else:
        submission_doc.pop("_id", None)

    return submission_doc


@router.get("/code/history")
async def submission_history(
    problem_id: str = None,
    page: int = 1,
    limit: int = 20,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"student_id": user["id"]}
    if problem_id:
        query["problem_id"] = problem_id

    skip = (page - 1) * limit
    subs = await db.code_submissions.find(
        query, {"code": 0}  # exclude code for listing
    ).sort("submitted_at", -1).skip(skip).limit(limit).to_list(limit)

    for s in subs:
        s["id"] = str(s.pop("_id"))

    total = await db.code_submissions.count_documents(query)
    return {"submissions": subs, "total": total}


@router.get("/aptitude/history")
async def aptitude_history(
    test_id: str = None,
    page: int = 1,
    limit: int = 20,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"student_id": user["id"]}
    if test_id:
        query["test_id"] = test_id

    skip = (page - 1) * limit
    subs = await db.apt_submissions.find(query).sort("submitted_at", -1).skip(skip).limit(limit).to_list(limit)

    for s in subs:
        s["id"] = str(s.pop("_id"))

    total = await db.apt_submissions.count_documents(query)
    return {"submissions": subs, "total": total}


@router.get("/competitions/history")
async def competition_history(
    competition_id: str = None,
    page: int = 1,
    limit: int = 20,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"student_id": user["id"]}
    if competition_id:
        query["competition_id"] = competition_id

    skip = (page - 1) * limit
    subs = await db.competition_submissions.find(query).sort("submitted_at", -1).skip(skip).limit(limit).to_list(limit)

    for s in subs:
        s["id"] = str(s.pop("_id"))

    total = await db.competition_submissions.count_documents(query)
    return {"submissions": subs, "total": total}


@router.get("/code/{submission_id}")
async def get_submission(submission_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    sub = await db.code_submissions.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(404, "Submission not found")

    # Students can only view own submissions
    if user["role"] == "student" and sub["student_id"] != user["id"]:
        raise HTTPException(403, "Access denied")

    sub["id"] = str(sub.pop("_id"))
    return sub


# ─── Aptitude / Technical submissions ────────────────────────────────────────

@router.post("/aptitude")
async def submit_aptitude(
    test_id: str,
    answers: dict,   # {question_id: answer}
    time_taken_ms: int = 0,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    test = await db.tests.find_one({"_id": ObjectId(test_id)})
    if not test:
        raise HTTPException(404, "Test not found")
    if not test.get("is_active", True):
        raise HTTPException(403, "This test is currently disabled")

    section_name = None
    section_id = test.get("section_id")
    section = await _load_section_doc(db, "apt_sections", section_id)
    if section:
        if user["role"] == "student":
            if not section.get("is_active", True):
                raise HTTPException(403, "This section is currently disabled")
            student_branch = user.get("branch") or user.get("department")
            if section.get("branch") and section.get("branch") != student_branch:
                raise HTTPException(403, "This section is not available for your branch")
        section_name = section.get("name")

    # Check attempt limit
    if test.get("max_attempts"):
        prev = await db.apt_submissions.count_documents({
            "student_id": user["id"], "test_id": test_id
        })
        if prev >= test["max_attempts"]:
            raise HTTPException(429, "Maximum attempts reached")

    # Grade
    exam_mode = test.get("mode", "practice")
    score = 0.0
    result_detail = []
    question_query = {
        "_id": {"$in": [ObjectId(qid) for qid in test["question_ids"]]},
    }
    if user.get("role") == "student":
        question_query["is_active"] = True
    questions = await db.apt_questions.find(
        question_query
    ).to_list(500)

    for q in questions:
        qid = str(q["_id"])
        student_ans = answers.get(qid)
        correct = False

        if q["question_type"] in ("mcq", "msq"):
            correct = set(student_ans or []) == set(q.get("correct_options", []))
        elif q["question_type"] in ("nat", "fill"):
            correct = str(student_ans or "").strip().lower() == str(q.get("correct_answer", "")).strip().lower()

        if correct:
            score += q.get("marks", 1)
        else:
            score -= q.get("negative_marks", 0)

        detail_item = {
            "question_id": qid,
            "student_answer": student_ans,
            "correct": correct,
            "marks_earned": q.get("marks", 1) if correct else -q.get("negative_marks", 0),
        }

        # Show full review data only in practice mode.
        if exam_mode == "practice":
            detail_item["question_text"] = q.get("question_text")
            detail_item["question_type"] = q.get("question_type")

            if q.get("question_type") in ("mcq", "msq"):
                options = q.get("options") or []
                correct_indexes = q.get("correct_options") or []
                detail_item["options"] = options
                detail_item["correct_answer"] = [
                    options[idx] for idx in correct_indexes if isinstance(idx, int) and 0 <= idx < len(options)
                ]
            else:
                detail_item["correct_answer"] = q.get("correct_answer")

            if q.get("explanation"):
                detail_item["explanation"] = q.get("explanation")

        result_detail.append(detail_item)

    submission = {
        "test_id": test_id,
        "student_id": user["id"],
        "student_user_id": user["id"],
        "section_id": test.get("section_id"),
        "section_name": section_name,
        "concept_id": test.get("concept_id") or test.get("section_id"),
        "section_type": test.get("section_type", "aptitude"),
        "exam_type": exam_mode,
        "test_name": test.get("name"),
        "score": max(0, score),
        "result_detail": result_detail,
        "time_taken_ms": max(0, int(time_taken_ms or 0)),
        "submitted_at": datetime.utcnow(),
    }

    inserted = await db.apt_submissions.insert_one(submission)

    await db.students.update_one(
        {"_id": ObjectId(user["id"])} ,
        {"$inc": {"stats.tests_attempted": 1, **({"stats.total_score": max(0, score)} if exam_mode == "competitor" else {})}},
    )

    # Only competitor mode affects leaderboard.
    if exam_mode == "competitor":
        await _update_leaderboard(
            db,
            user["id"],
            test.get("section_type", "aptitude"),
            max(0, score),
            section_id=test.get("section_id"),
            test_id=test_id,
            section_name=section_name,
            test_name=test.get("name"),
        )
        await ws_manager.broadcast("leaderboard", {"type": "score_update"})

    response = {"id": str(inserted.inserted_id), "score": max(0, score)}
    if exam_mode == "practice":
        response["detail"] = result_detail
    return response


async def _update_leaderboard(db, student_id: str, section: str, score: float):
    existing = await db.leaderboard.find_one({"student_id": student_id, "section": section})
    if existing:
        if score > existing.get("score", 0):
            await db.leaderboard.update_one(
                {"student_id": student_id, "section": section},
                {"$set": {"score": score, "updated_at": datetime.utcnow()}},
            )
    else:
        await db.leaderboard.insert_one({
            "student_id": student_id,
            "section": section,
            "score": score,
            "updated_at": datetime.utcnow(),
        })
