import json
import re
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import Any, Optional
from datetime import datetime
from bson import ObjectId
import io
import pandas as pd

from app.core.access import student_access_clauses, student_matches_access
from app.core.security import require_faculty, get_current_user
from app.db.mongodb import get_db
from app.models.schemas import CodingSectionCreate, CodingProblemCreate, Mode
from app.utils.bulk_upload import CODING_TEMPLATE_COLUMNS, build_excel_template, cell_bool, cell_int, cell_text

router = APIRouter()


def _parse_private_test_cases(value: Any) -> list[dict[str, str]]:
    text = cell_text(value)
    if text is None:
        return []

    normalized = text.strip()
    if not normalized or normalized.lower() in {"none", "null", "na", "n/a", "-"}:
        return []

    parsed = None
    try:
        parsed = json.loads(normalized)
    except (TypeError, ValueError, json.JSONDecodeError):
        parsed = None

    cases: list[dict[str, str]] = []
    if isinstance(parsed, dict):
        parsed = [parsed]
    if isinstance(parsed, list):
        for item in parsed:
            if not isinstance(item, dict):
                continue
            input_text = cell_text(item.get("input"))
            expected_text = cell_text(item.get("expected_output"))
            if input_text is None or expected_text is None:
                continue
            cases.append({"input": input_text, "expected_output": expected_text})
        if cases:
            return cases

    for chunk in re.split(r"[\r\n|]+", normalized):
        piece = chunk.strip()
        if not piece or "=>" not in piece:
            continue
        input_text, expected_text = piece.split("=>", 1)
        input_text = input_text.strip()
        expected_text = expected_text.strip()
        if input_text and expected_text:
            cases.append({"input": input_text, "expected_output": expected_text})

    if cases:
        return cases

    raise ValueError("private_test_cases must be a JSON array of {input, expected_output} objects or input=>expected_output pairs")


# ─── Sections ────────────────────────────────────────────────────────────────

@router.post("/sections", status_code=201)
async def create_section(
    data: CodingSectionCreate,
    mode: str = "practice",
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    doc = {
        **data.model_dump(),
        "is_active": data.is_active,
        "mode": mode,
        "created_by": user["id"],
        "created_at": datetime.utcnow(),
    }
    result = await db.coding_sections.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Section created"}


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
    query = {}
    if mode:
        query["mode"] = mode
    if user.get("role") == "student":
        query["is_active"] = True
        access_clauses = student_access_clauses(user)
        if access_clauses:
            query["$and"] = query.get("$and", []) + access_clauses

    sections = await db.coding_sections.find(query).to_list(200)
    for s in sections:
        s["id"] = str(s.pop("_id"))
        s["problem_count"] = await db.coding_problems.count_documents({"section_id": s["id"]})

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
    section = await db.coding_sections.find_one({"_id": ObjectId(section_id)})
    if not section:
        raise HTTPException(404, "Section not found")
    if user.get("role") == "student":
        if not section.get("is_active", True) or not student_matches_access(user, section):
            raise HTTPException(404, "Section not found")
    section["id"] = str(section.pop("_id"))
    return section


@router.put("/sections/{section_id}")
async def update_section(
    section_id: str,
    data: CodingSectionCreate,
    db=Depends(get_db),
    _=Depends(require_faculty),
):
    await db.coding_sections.update_one(
        {"_id": ObjectId(section_id)},
        {"$set": data.model_dump()},
    )
    return {"message": "Section updated"}


@router.delete("/sections/{section_id}")
async def delete_section(section_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    await db.coding_sections.delete_one({"_id": ObjectId(section_id)})
    await db.coding_problems.delete_many({"section_id": section_id})
    return {"message": "Section deleted"}


# ─── Problems ────────────────────────────────────────────────────────────────

@router.post("/problems", status_code=201)
async def create_problem(
    data: CodingProblemCreate,
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    # Check duplicate problem_id
    if await db.coding_problems.find_one({"problem_id": data.problem_id}):
        raise HTTPException(409, "Problem ID already exists")

    doc = {
        **data.model_dump(),
        "is_active": data.is_active,
        "created_by": user["id"],
        "created_at": datetime.utcnow(),
    }
    result = await db.coding_problems.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Problem created"}


@router.get("/problems")
async def list_problems(
    section_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    mode: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {}
    if section_id:
        query["section_id"] = section_id
    if difficulty:
        query["difficulty"] = difficulty
    if mode:
        query["mode"] = mode
    if user["role"] == "student":
        query["is_active"] = True
        access_clauses = student_access_clauses(user)
        if access_clauses:
            query["$and"] = query.get("$and", []) + access_clauses

    if user["role"] == "student" and section_id:
        section = await db.coding_sections.find_one({"_id": ObjectId(section_id)})
        if not section or not section.get("is_active", True) or not student_matches_access(user, section):
            return {"problems": [], "total": 0, "page": page, "limit": limit}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"statement": {"$regex": search, "$options": "i"}},
            {"problem_id": {"$regex": search, "$options": "i"}},
        ]

    # Students should NOT see private test cases or editorial via listing
    projection = {"private_test_cases": 0}
    if user["role"] == "student":
        projection["editorial"] = 0

    skip = (page - 1) * limit
    problems = await db.coding_problems.find(query, projection).skip(skip).limit(limit).to_list(limit)
    total = await db.coding_problems.count_documents(query)

    for p in problems:
        p["id"] = str(p.pop("_id"))

    return {"problems": problems, "total": total, "page": page, "limit": limit}


@router.get("/problems/{problem_id}")
async def get_problem(problem_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    try:
        query = {"_id": ObjectId(problem_id)}
    except Exception:
        query = {"problem_id": problem_id}

    projection = {"private_test_cases": 0}
    if user["role"] == "student":
        projection["editorial"] = 0

    problem = await db.coding_problems.find_one(query, projection)
    if not problem:
        raise HTTPException(404, "Problem not found")
    if user["role"] == "student" and not problem.get("is_active", True):
        raise HTTPException(403, "Problem is disabled")

    if user["role"] == "student" and problem.get("section_id") and ObjectId.is_valid(str(problem.get("section_id"))):
        section = await db.coding_sections.find_one({"_id": ObjectId(problem.get("section_id"))})
        if not section or not section.get("is_active", True) or not student_matches_access(user, section) or not student_matches_access(user, problem):
            raise HTTPException(404, "Problem not found")

    problem["id"] = str(problem.pop("_id"))
    return problem


@router.put("/problems/{problem_id}")
async def update_problem(
    problem_id: str,
    data: CodingProblemCreate,
    db=Depends(get_db),
    _=Depends(require_faculty),
):
    await db.coding_problems.update_one(
        {"_id": ObjectId(problem_id)},
        {"$set": data.model_dump()},
    )
    return {"message": "Problem updated"}


@router.delete("/problems/{problem_id}")
async def delete_problem(problem_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    await db.coding_problems.delete_one({"_id": ObjectId(problem_id)})
    return {"message": "Problem deleted"}


@router.patch("/problems/{problem_id}/toggle")
async def toggle_problem(problem_id: str, db=Depends(get_db), _=Depends(require_faculty)):
    problem = await db.coding_problems.find_one({"_id": ObjectId(problem_id)})
    if not problem:
        raise HTTPException(404, "Problem not found")
    new_state = not problem.get("is_active", True)
    await db.coding_problems.update_one({"_id": ObjectId(problem_id)}, {"$set": {"is_active": new_state}})
    return {"id": problem_id, "is_active": new_state}


@router.post("/problems/bulk-upload")
async def bulk_upload_problems(
    section_id: str,
    mode: str,
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(require_faculty),
):
    content = await file.read()
    df = pd.read_excel(io.BytesIO(content))
    created, errors = 0, []
    normalized_mode = (mode or "practice").lower()

    for idx, row in df.iterrows():
        try:
            problem_id = cell_text(row.get("problem_id"))
            if not problem_id:
                raise ValueError("problem_id is required")
            if await db.coding_problems.find_one({"problem_id": problem_id}):
                raise ValueError("problem_id already exists")

            name = cell_text(row.get("name"))
            if not name:
                raise ValueError("name is required")

            statement = cell_text(row.get("statement"))
            if not statement:
                raise ValueError("statement is required")

            sample_input_1 = cell_text(row.get("sample_input_1"))
            if sample_input_1 is None:
                raise ValueError("sample_input_1 is required")

            sample_output_1 = cell_text(row.get("sample_output_1"))
            if sample_output_1 is None:
                raise ValueError("sample_output_1 is required")

            doc = {
                "problem_id": problem_id,
                "section_id": section_id,
                "mode": normalized_mode,
                "banner_url": cell_text(row.get("banner_url")),
                "name": name,
                "statement": statement,
                "constraints": cell_text(row.get("constraints"), "") or "",
                "sample_input_1": sample_input_1,
                "sample_output_1": sample_output_1,
                "sample_input_2": cell_text(row.get("sample_input_2"), "") or "",
                "sample_output_2": cell_text(row.get("sample_output_2"), "") or "",
                "private_test_cases": _parse_private_test_cases(row.get("private_test_cases")),
                "difficulty": (cell_text(row.get("difficulty"), "Medium") or "Medium").title(),
                "marks": cell_int(row.get("marks"), 0) if normalized_mode == "competitor" else None,
                "editorial": cell_text(row.get("editorial")) if normalized_mode == "practice" else None,
                "branch": cell_text(row.get("branch")),
                "is_active": cell_bool(row.get("is_active"), True),
                "created_by": user["id"],
                "created_at": datetime.utcnow(),
            }
            await db.coding_problems.insert_one(doc)
            created += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})

    return {"created": created, "errors": errors}


@router.get("/problems/bulk-upload/template")
async def download_problem_template(mode: str = "practice", _=Depends(require_faculty)):
    normalized_mode = (mode or "practice").lower()
    return build_excel_template(
        CODING_TEMPLATE_COLUMNS,
        f"coding_{normalized_mode}_problems_template.xlsx",
        sheet_name="Problems",
    )
