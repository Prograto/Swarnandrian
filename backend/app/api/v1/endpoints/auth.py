from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from app.models.schemas import LoginRequest, TokenResponse, AdminCreate, FacultyCreate, StudentCreate
from app.core.security import hash_password, verify_password, create_access_token
from app.db.mongodb import get_db

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db=Depends(get_db)):
    collection_map = {
        "admin": ("admins", "admin_id"),
        "faculty": ("faculty", "faculty_id"),
        "student": ("students", "student_id"),
    }

    coll_name, id_field = collection_map[request.role]
    user = await db[coll_name].find_one({id_field: request.user_id})

    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    now = datetime.utcnow()
    token = create_access_token({"sub": str(user["_id"]), "role": request.role})

    # Build user response (exclude sensitive fields)
    user_out = {k: str(v) if k == "_id" else v for k, v in user.items() if k not in ("password_hash",)}
    user_out["id"] = str(user["_id"])

    await db[coll_name].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": now}},
    )
    await db.login_history.insert_one({
        "user_id": str(user["_id"]),
        "role": request.role.value,
        "identifier": user.get(id_field, request.user_id),
        "user_name": user.get("name", ""),
        "department": user.get("department", ""),
        "section": user.get("section", ""),
        "course": user.get("course"),
        "year": user.get("year"),
        "is_active": user.get("is_active", True),
        "login_at": now,
        "created_at": now,
    })

    return TokenResponse(access_token=token, role=request.role, user=user_out)


@router.post("/register/student", status_code=201)
async def register_student(data: StudentCreate, db=Depends(get_db)):
    existing = await db.students.find_one({"student_id": data.student_id})
    if existing:
        raise HTTPException(status_code=409, detail="Student ID already exists")

    doc = {
        **data.model_dump(exclude={"password"}),
        "password_hash": hash_password(data.password),
        "is_active": True,
        "created_at": datetime.utcnow(),
        "profile": {},
        "stats": {"total_score": 0, "problems_solved": 0, "tests_attempted": 0},
    }
    result = await db.students.insert_one(doc)
    return {"message": "Student registered", "id": str(result.inserted_id)}


@router.post("/register/admin", status_code=201)
async def register_admin(data: AdminCreate, db=Depends(get_db)):
    existing = await db.admins.find_one({"admin_id": data.admin_id})
    if existing:
        raise HTTPException(status_code=409, detail="Admin ID already exists")

    doc = {
        **data.model_dump(exclude={"password"}),
        "password_hash": hash_password(data.password),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.admins.insert_one(doc)
    return {"message": "Admin registered"}


@router.post("/register/faculty", status_code=201)
async def register_faculty(data: FacultyCreate, db=Depends(get_db)):
    existing = await db.faculty.find_one({"faculty_id": data.faculty_id})
    if existing:
        raise HTTPException(status_code=409, detail="Faculty ID already exists")

    doc = {
        **data.model_dump(exclude={"password"}),
        "password_hash": hash_password(data.password),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.faculty.insert_one(doc)
    return {"message": "Faculty registered"}
