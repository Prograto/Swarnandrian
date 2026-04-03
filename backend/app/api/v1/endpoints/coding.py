from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import Optional
from datetime import datetime
from bson import ObjectId
import io
import pandas as pd

from app.core.security import require_faculty, get_current_user
from app.db.mongodb import get_db
from app.models.schemas import CodingSectionCreate, CodingProblemCreate, Mode

router = APIRouter()


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

    sections = await db.coding_sections.find(query).to_list(200)
    student_branch = user.get("branch") or user.get("department")
    for s in sections:
        s["id"] = str(s.pop("_id"))
        s["problem_count"] = await db.coding_problems.count_documents({"section_id": s["id"]})

    if search:
        needle = search.strip().lower()
        sections = [
            s for s in sections
            if needle in f"{s.get('name', '')} {s.get('description', '')}".lower()
        ]

    if user.get("role") == "student" and student_branch:
        sections = [s for s in sections if not s.get("branch") or s.get("branch") == student_branch]

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
        student_branch = user.get("branch") or user.get("department")
        if not section.get("is_active", True) or (section.get("branch") and section.get("branch") != student_branch):
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

    student_branch = user.get("branch") or user.get("department")
    if user["role"] == "student" and section_id:
        section = await db.coding_sections.find_one({"_id": ObjectId(section_id)})
        if not section or not section.get("is_active", True) or (section.get("branch") and section.get("branch") != student_branch):
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
    if user["role"] == "student" and student_branch:
        problems = [p for p in problems if not p.get("branch") or p.get("branch") == student_branch]
        total = len(problems)

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
        student_branch = user.get("branch") or user.get("department")
        if not section or not section.get("is_active", True) or (section.get("branch") and section.get("branch") != student_branch):
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

    for idx, row in df.iterrows():
        try:
            problem_id = str(row.get("problem_id", "")).strip()
            if not problem_id:
                raise ValueError("problem_id is required")
            if await db.coding_problems.find_one({"problem_id": problem_id}):
                raise ValueError("problem_id already exists")

            doc = {
                "problem_id": problem_id,
                "section_id": section_id,
                "mode": mode,
                "banner_url": row.get("banner_url") or None,
                "name": str(row.get("name", "")).strip(),
                "statement": str(row.get("statement", "")).strip(),
                "constraints": str(row.get("constraints", "")).strip(),
                "sample_input_1": str(row.get("sample_input_1", "")).strip(),
                "sample_output_1": str(row.get("sample_output_1", "")).strip(),
                "sample_input_2": str(row.get("sample_input_2", "")).strip(),
                "sample_output_2": str(row.get("sample_output_2", "")).strip(),
                "private_test_cases": [],
                "difficulty": str(row.get("difficulty", "Medium")),
                "marks": int(row.get("marks", 0)) if mode == "competitor" else None,
                "editorial": str(row.get("editorial", "")).strip() if mode == "practice" else None,
                "branch": row.get("branch") or None,
                "is_active": bool(row.get("is_active", True)),
                "created_by": user["id"],
                "created_at": datetime.utcnow(),
            }
            await db.coding_problems.insert_one(doc)
            created += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})

    return {"created": created, "errors": errors}
