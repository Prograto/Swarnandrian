from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from datetime import datetime
from bson import ObjectId
from typing import Optional
import pandas as pd
import io

from app.core.access import student_access_clauses, student_matches_access
from app.core.security import require_faculty, get_current_user
from app.db.mongodb import get_db
from app.models.schemas import AptSectionCreate, AptQuestionCreate, AptTestCreate, SectionType
from app.utils.bulk_upload import (
    QUESTION_TEMPLATE_COLUMNS,
    build_excel_template,
    cell_bool,
    cell_float,
    cell_int,
    cell_text,
    split_csv_ints,
    split_pipe_values,
)

router = APIRouter()


def _normalize_correct_options(values: Optional[list[int]]) -> Optional[list[int]]:
    if not values:
        return None

    cleaned = []
    for value in values:
        try:
            cleaned.append(int(value))
        except (TypeError, ValueError):
            continue

    if not cleaned:
        return None

    if all(value > 0 for value in cleaned):
        return [value - 1 for value in cleaned]

    return cleaned


# ─── Sections ────────────────────────────────────────────────────────────────

@router.post("/sections", status_code=201)
async def create_section(data: AptSectionCreate, mode: str = "practice", db=Depends(get_db), user=Depends(require_faculty)):
    doc = {**data.model_dump(), "type": "aptitude", "mode": mode, "is_active": data.is_active, "created_by": user["id"], "created_at": datetime.utcnow()}
    result = await db.apt_sections.insert_one(doc)
    return {"id": str(result.inserted_id)}


@router.get("/sections")
async def list_sections(
    mode: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 12,
    paginate: bool = False,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"type": "aptitude"}
    if mode: query["mode"] = mode
    if user.get("role") == "student":
        query["is_active"] = True
        access_clauses = student_access_clauses(user)
        if access_clauses:
            query["$and"] = query.get("$and", []) + access_clauses
    sections = await db.apt_sections.find(query).to_list(200)
    for s in sections:
        s["id"] = str(s.pop("_id"))
        s["question_count"] = await db.apt_questions.count_documents({"section_id": s["id"], "section_type": "aptitude"})
        test_query = {"section_id": s["id"], "section_type": "aptitude"}
        if mode:
            test_query["mode"] = mode
        if user.get("role") == "student":
            test_query["is_active"] = True
            access_clauses = student_access_clauses(user)
            if access_clauses:
                test_query["$and"] = test_query.get("$and", []) + access_clauses
        s["test_count"] = await db.tests.count_documents(test_query)

    if search:
        needle = search.strip().lower()
        sections = [
            s for s in sections
            if needle in f"{s.get('name', '')} {s.get('description', '')}".lower()
        ]

    if not paginate:
        return sections

    start = (max(page, 1) - 1) * max(limit, 1)
    end = start + max(limit, 1)
    return {
        "items": sections[start:end],
        "total": len(sections),
        "page": page,
        "limit": limit,
    }


@router.get("/sections/{section_id}")
async def get_section(section_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    s = await db.apt_sections.find_one({"_id": ObjectId(section_id)})
    if not s:
        raise HTTPException(404, "Section not found")
    if user.get("role") == "student":
        if not s.get("is_active", True) or not student_matches_access(user, s):
            raise HTTPException(404, "Section not found")
    s["id"] = str(s.pop("_id"))
    return s


@router.delete("/sections/{section_id}")
async def delete_section(section_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    await db.apt_sections.delete_one({"_id": ObjectId(section_id)})
    await db.apt_questions.delete_many({"section_id": section_id})
    await db.tests.delete_many({"section_id": section_id, "section_type": "aptitude"})
    return {"message": "Section deleted"}


@router.put("/sections/{section_id}")
async def update_section(section_id: str, data: AptSectionCreate, db=Depends(get_db), _=Depends(require_faculty)):
    await db.apt_sections.update_one({"_id": ObjectId(section_id)}, {"$set": data.model_dump()})
    return {"message": "Section updated"}


# ─── Questions ───────────────────────────────────────────────────────────────

@router.post("/questions", status_code=201)
async def create_question(data: AptQuestionCreate, db=Depends(get_db), user=Depends(require_faculty)):
    payload = data.model_dump()
    payload["correct_options"] = _normalize_correct_options(payload.get("correct_options"))
    doc = {**payload, "section_type": "aptitude", "is_active": data.is_active, "created_by": user["id"], "created_at": datetime.utcnow()}
    result = await db.apt_questions.insert_one(doc)
    return {"id": str(result.inserted_id)}


@router.get("/questions")
async def list_questions(
    section_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"section_type": "aptitude"}
    if section_id:
        query["section_id"] = section_id
    if difficulty:
        query["difficulty"] = difficulty
    if question_type:
        query["question_type"] = question_type
    if user["role"] == "student":
        query["is_active"] = True
        access_clauses = student_access_clauses(user)
        if access_clauses:
            query["$and"] = query.get("$and", []) + access_clauses

    # Hide answers from students in practice mode
    projection = {}
    if user["role"] == "student":
        projection = {"correct_options": 0, "correct_answer": 0}
    if user["role"] == "student" and section_id:
        section = await db.apt_sections.find_one({"_id": ObjectId(section_id)})
        if not section or not section.get("is_active", True) or not student_matches_access(user, section):
            return {"questions": [], "total": 0, "page": page}

    skip = (page - 1) * limit
    questions = await db.apt_questions.find(query, projection).skip(skip).limit(limit).to_list(limit)
    total = await db.apt_questions.count_documents(query)
    if user.get("role") == "student" and student_branch:
        questions = [q for q in questions if not q.get("branch") or q.get("branch") == student_branch]
        total = len(questions)
    for q in questions:
        q["id"] = str(q.pop("_id"))
    return {"questions": questions, "total": total, "page": page}


@router.put("/questions/{qid}")
async def update_question(qid: str, data: AptQuestionCreate, db=Depends(get_db), _=Depends(require_faculty)):
    payload = data.model_dump()
    payload["correct_options"] = _normalize_correct_options(payload.get("correct_options"))
    await db.apt_questions.update_one({"_id": ObjectId(qid)}, {"$set": payload})
    return {"message": "Updated"}


@router.delete("/questions/{qid}")
async def delete_question(qid: str, db=Depends(get_db), _=Depends(require_faculty)):
    await db.apt_questions.delete_one({"_id": ObjectId(qid)})
    return {"message": "Deleted"}


@router.post("/questions/bulk-upload")
async def bulk_upload_questions(
    section_id: str,
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    content = await file.read()
    df = pd.read_excel(io.BytesIO(content))
    created, errors = 0, []

    for idx, row in df.iterrows():
        try:
            options = split_pipe_values(row.get("options"))
            correct_opts = _normalize_correct_options(split_csv_ints(row.get("correct_options")))

            doc = {
                "section_id": section_id,
                "section_type": "aptitude",
                "question_type": (cell_text(row.get("question_type"), "mcq") or "mcq").lower(),
                "question_text": cell_text(row.get("question_text"), "") or "",
                "image_url": cell_text(row.get("image_url")),
                "options": options,
                "correct_options": correct_opts,
                "correct_answer": cell_text(row.get("correct_answer")),
                "explanation": cell_text(row.get("explanation")),
                "marks": cell_int(row.get("marks"), 1),
                "negative_marks": cell_float(row.get("negative_marks"), 0),
                "difficulty": (cell_text(row.get("difficulty"), "Medium") or "Medium").title(),
                "branch": cell_text(row.get("branch")),
                "is_active": cell_bool(row.get("is_active"), True),
                "created_by": user["id"],
                "created_at": datetime.utcnow(),
            }
            await db.apt_questions.insert_one(doc)
            created += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})

    return {"created": created, "errors": errors}


@router.get("/questions/bulk-upload/template")
async def download_question_template(_=Depends(require_faculty)):
    return build_excel_template(QUESTION_TEMPLATE_COLUMNS, "aptitude_questions_template.xlsx", sheet_name="Questions")


# ─── Tests ───────────────────────────────────────────────────────────────────

@router.post("/tests", status_code=201)
async def create_test(data: AptTestCreate, db=Depends(get_db), user=Depends(require_faculty)):
    doc = {
        **data.model_dump(),
        "section_type": "aptitude",
        "is_active": data.is_active,
        "created_by": user["id"],
        "created_at": datetime.utcnow(),
    }
    result = await db.tests.insert_one(doc)
    return {"id": str(result.inserted_id)}


@router.get("/tests")
async def list_tests(
    section_id: Optional[str] = None,
    mode: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 12,
    paginate: bool = False,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"section_type": "aptitude"}
    if section_id:
        query["section_id"] = section_id
    if mode:
        query["mode"] = mode
    if user.get("role") == "student":
        query["is_active"] = True
        access_clauses = student_access_clauses(user)
        if access_clauses:
            query["$and"] = query.get("$and", []) + access_clauses
    tests = await db.tests.find(query).to_list(200)
    if user.get("role") == "student" and section_id:
        section = await db.apt_sections.find_one({"_id": ObjectId(section_id)})
        if not section or not section.get("is_active", True) or not student_matches_access(user, section):
            tests = []

    if search:
        needle = search.strip().lower()
        tests = [
            t for t in tests
            if needle in f"{t.get('name', '')} {t.get('description', '')}".lower()
        ]

    for t in tests:
        t["id"] = str(t.pop("_id"))

    if not paginate:
        return tests

    start = (max(page, 1) - 1) * max(limit, 1)
    end = start + max(limit, 1)
    return {
        "items": tests[start:end],
        "total": len(tests),
        "page": page,
        "limit": limit,
    }


@router.get("/tests/{test_id}")
async def get_test(test_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    test = await db.tests.find_one({"_id": ObjectId(test_id)})
    if not test:
        raise HTTPException(404, "Test not found")
    if user.get("role") == "student" and not test.get("is_active", True):
        raise HTTPException(403, "Test is disabled")

    section = await db.apt_sections.find_one({"_id": ObjectId(test.get("section_id"))}) if test.get("section_id") and ObjectId.is_valid(str(test.get("section_id"))) else None
    if user.get("role") == "student":
        if not section or not section.get("is_active", True) or not student_matches_access(user, section) or not student_matches_access(user, test):
            raise HTTPException(404, "Test not found")

    # Fetch questions (hide answers for students)
    projection = {}
    if user["role"] == "student":
        projection = {"correct_options": 0, "correct_answer": 0, "explanation": 0}

    question_ids = [ObjectId(qid) for qid in test.get("question_ids", [])]
    question_query = {"_id": {"$in": question_ids}}
    if user["role"] == "student":
        question_query["is_active"] = True
    questions = await db.apt_questions.find(question_query, projection).to_list(500)
    for q in questions:
        q["id"] = str(q.pop("_id"))

    if user.get("role") == "student":
        attempts_used = await db.apt_submissions.count_documents({"student_id": user["id"], "test_id": test_id})
        max_attempts = test.get("max_attempts")
        attempts_remaining = None
        try:
            if max_attempts not in (None, ""):
                attempts_remaining = max(0, int(max_attempts) - attempts_used)
        except (TypeError, ValueError):
            attempts_remaining = None
        test["attempts_used"] = attempts_used
        test["attempts_remaining"] = attempts_remaining

    test["id"] = str(test.pop("_id"))
    test["questions"] = questions
    return test


@router.delete("/tests/{test_id}")
async def delete_test(test_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    await db.tests.delete_one({"_id": ObjectId(test_id)})
    return {"message": "Test deleted"}


@router.put("/tests/{test_id}")
async def update_test(test_id: str, data: AptTestCreate, db=Depends(get_db), _=Depends(require_faculty)):
    await db.tests.update_one(
        {"_id": ObjectId(test_id)},
        {"$set": {**data.model_dump(), "section_type": "aptitude"}},
    )
    return {"message": "Test updated"}


@router.patch("/tests/{test_id}/toggle")
async def toggle_test(test_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    test = await db.tests.find_one({"_id": ObjectId(test_id), "section_type": "aptitude"})
    if not test:
        raise HTTPException(404, "Test not found")
    new_state = not test.get("is_active", True)
    await db.tests.update_one({"_id": ObjectId(test_id)}, {"$set": {"is_active": new_state}})
    return {"id": test_id, "is_active": new_state}
